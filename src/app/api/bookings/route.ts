import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe, toMinorUnits } from "@/lib/stripe";
import { bookingRequestSchema } from "@/lib/validations";
import { calculateMarketplaceFees } from "@/lib/marketplace-fees";
import { writeAuditLog } from "@/lib/audit-log";
import { sendBookingRequestEmail } from "@/lib/email-templates";
import { getRequestMetadata } from "@/lib/request-context";
import { getLogger } from "@/lib/logger";
import { recordVenueCard } from "@/lib/p2p-policy";

const log = getLogger("api-bookings-post");
const NEGOTIATION_RESPONSE_WINDOW_MS = 48 * 60 * 60 * 1000;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "musician") {
    const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
    if (!musician) return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });

    const bookings = await prisma.booking.findMany({
      where: { musicianId: musician.id },
      include: { venue: { select: { venueName: true, location: true } } },
      orderBy: { eventDate: "desc" },
    });
    return NextResponse.json({ success: true, data: bookings });
  }

  if (session.user.role === "venue") {
    const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
    if (!venue) return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });

    const bookings = await prisma.booking.findMany({
      where: { venueId: venue.id },
      include: { musician: { select: { stageName: true } } },
      orderBy: { eventDate: "desc" },
    });
    return NextResponse.json({ success: true, data: bookings });
  }

  return NextResponse.json({ success: true, data: [] });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!venue) {
    return NextResponse.json({ success: false, message: "Venue profile not found" }, { status: 404 });
  }

  if (!venue.stripeCustomerId) {
    return NextResponse.json(
      { success: false, message: "Unable to verify payment method. Please try again." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = bookingRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid booking request", errors: parsed.error.flatten() }, { status: 400 });
  }

  const musician = await prisma.musicianProfile.findUnique({
    where: { id: parsed.data.musicianId, user: { deletedAt: null } },
    include: { user: { select: { email: true } } },
  });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Musician not found" }, { status: 404 });
  }
  if (musician.userId === session.user.id) {
    return NextResponse.json({ success: false, message: "You cannot book your own profile." }, { status: 400 });
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(parsed.data.paymentMethodId);
  if (paymentMethod.customer !== venue.stripeCustomerId) {
    return NextResponse.json(
      { success: false, message: "That payment method is not valid for your account." },
      { status: 400 }
    );
  }

  const fees = calculateMarketplaceFees(parsed.data.fee, { currency: parsed.data.currency });

  // Direct Hires place a manual-capture pre-authorization hold at request
  // time (not a charge). The artist has 48 hours to accept/decline/counter;
  // the hold is captured on acceptance, cancelled on decline/expiry, or
  // replaced on an accepted counter-offer. See .claude/skills/stripe-connect/SKILL.md.
  let paymentIntent: Stripe.PaymentIntent;
  try {
    void recordVenueCard(venue.id, parsed.data.paymentMethodId);
    paymentIntent = await stripe.paymentIntents.create({
      amount: toMinorUnits(fees.totalChargeAmount),
      currency: (parsed.data.currency ?? "EUR").toLowerCase(),
      customer: venue.stripeCustomerId,
      payment_method: parsed.data.paymentMethodId,
      capture_method: "manual",
      off_session: true,
      confirm: true,
    });
  } catch (error) {
    log.warn({ err: error }, "Pre-authorization hold failed at booking request time");
    return NextResponse.json(
      { success: false, message: "We couldn't place a hold on your payment method. Please check your card and try again." },
      { status: 402 }
    );
  }

  const booking = await prisma.booking.create({
    data: {
      musicianId: musician.id,
      venueId: venue.id,
      title: parsed.data.title ?? "Gig booking",
      eventType: parsed.data.eventType ?? "Live performance",
      eventDate: new Date(parsed.data.eventDate),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      venueAddress: parsed.data.venueAddress ?? "",
      audienceSize: parsed.data.audienceSize,
      loadInTime: parsed.data.loadInTime,
      soundcheckTime: parsed.data.soundcheckTime,
      setupNotes: parsed.data.setupNotes,
      requiredServices: parsed.data.requiredServices ?? [],
      equipmentProvided: parsed.data.equipmentProvided ?? [],
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail,
      contactPhone: parsed.data.contactPhone,
      notes: parsed.data.notes,
      fee: parsed.data.fee,
      currency: parsed.data.currency ?? "EUR",
      depositAmount: parsed.data.depositAmount ?? 0,
      cancellationPolicy: parsed.data.cancellationPolicy,
      platformFeeRate: fees.platformFeeRate,
      platformFeeAmount: fees.platformFeeAmount,
      processorFeeEstimate: fees.processorFeeEstimate,
      totalChargeAmount: fees.totalChargeAmount,
      netPayoutAmount: fees.artistPayoutAmount,
      source: "direct_request",
      status: "pending",
      paymentStatus: "authorized",
      stripeCustomerId: venue.stripeCustomerId,
      stripePaymentMethodId: parsed.data.paymentMethodId,
      stripePaymentIntentId: paymentIntent.id,
      negotiationStatus: "pending_response",
      proposedFee: parsed.data.fee,
      responseDeadline: new Date(Date.now() + NEGOTIATION_RESPONSE_WINDOW_MS),
    },
  });

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "booking_request_create",
    category: "booking",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "Booking",
    targetId: booking.id,
  });

  if (musician.user.email) {
    sendBookingRequestEmail(
      { email: musician.user.email, name: musician.stageName },
      { venueName: venue.venueName, eventDate: booking.eventDate, fee: booking.fee, currency: booking.currency, bookingId: booking.id }
    ).catch((err) => log.error({ err }, "Failed to send booking request email"));
  }

  return NextResponse.json({ success: true, data: booking }, { status: 201 });
}
