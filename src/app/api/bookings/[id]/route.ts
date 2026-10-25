import { NextResponse } from "next/server";
import { z } from "zod/v4";
import type Stripe from "stripe";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";
import { placeHold, releaseHold, captureHold } from "@/lib/booking-escrow";
import { combineEventDateAndEndTime, combineEventDateAndStartTime } from "@/lib/event-datetime";
import { planPayment, balanceDueAt } from "@/lib/payment-structures";
import {
  sendBookingAcceptedEmail,
  sendBookingDeclinedEmail,
  sendBookingCancelledEmail,
  sendPaymentFailedEmail,
} from "@/lib/email-templates";

const log = getLogger("api-bookings-patch");
const NEGOTIATION_RESPONSE_WINDOW_MS = 48 * 60 * 60 * 1000;

const updateBookingSchema = z.object({
  action: z.enum(["accept", "decline", "cancel", "complete", "counter", "accept-counter", "decline-counter"]),
  counterFee: z.number().min(0).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateBookingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid booking update", errors: parsed.error.flatten() }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      musician: { select: { stageName: true, user: { select: { email: true } } } },
      venue: { select: { venueName: true, user: { select: { email: true } } } },
    },
  });
  if (!booking) {
    return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  }

  let isOwner = false;
  if (session.user.role === "musician") {
    const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
    isOwner = musician?.id === booking.musicianId;
  } else if (session.user.role === "venue") {
    const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
    isOwner = venue?.id === booking.venueId;
  }

  if (!isOwner) {
    return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  }

  const { action } = parsed.data;
  const isMusician = session.user.role === "musician";
  const isNegotiated = booking.source === "direct_request";
  if (booking.source === "job_application") {
    if (action !== "complete" || (booking.paymentStatus !== "paid" && booking.paymentStructure !== "milestone")) {
      return NextResponse.json({ success: false, message: "Open-call payment decisions must be managed from the open-call applicant screen. Paid bookings cannot be cancelled without a refund-resolution flow." }, { status: 409 });
    }
    const application = booking.jobApplicationId ? await prisma.jobApplication.findUnique({ where: { id: booking.jobApplicationId }, include: { jobListing: true } }) : null;
    if (!application?.jobListing.eventEndsAt || application.jobListing.eventEndsAt > new Date()) {
      return NextResponse.json({ success: false, message: "The event must end before it can be marked complete." }, { status: 400 });
    }
  }

  if (action === "complete" && booking.paymentStructure === "deposit_balance" && !booking.balanceChargedAt) {
    return NextResponse.json({ success: false, message: "The balance payment hasn't gone through yet, so this booking can't be completed." }, { status: 409 });
  }

  if (isNegotiated) {
    return handleNegotiatedAction({ booking, action, counterFee: parsed.data.counterFee, isMusician, session, requestId: id });
  }

  return handleSimpleAction({ booking, action, isMusician, session, requestId: id });
}

// Job-application-sourced bookings have no hold/negotiation — unchanged
// simple status transitions (payment already settled when the application
// was accepted).
async function handleSimpleAction({
  booking,
  action,
  isMusician,
  session,
  requestId: id,
}: {
  booking: NonNullable<Awaited<ReturnType<typeof prisma.booking.findUnique>>> & {
    musician: { stageName: string; user: { email: string | null } };
    venue: { venueName: string; user: { email: string | null } };
  };
  action: string;
  isMusician: boolean;
  session: Session;
  requestId: string;
}) {
  const transitions: Record<string, { allowed: boolean; status: "accepted" | "declined" | "cancelled" | "completed" }> = {
    accept: { allowed: isMusician && booking.status === "pending", status: "accepted" },
    decline: { allowed: isMusician && booking.status === "pending", status: "declined" },
    cancel: { allowed: booking.status === "pending" || booking.status === "accepted", status: "cancelled" },
    complete: { allowed: isMusician && booking.status === "accepted", status: "completed" },
  };

  const transition = transitions[action];
  if (!transition?.allowed) {
    return NextResponse.json({ success: false, message: "This action is not allowed for the booking's current state" }, { status: 400 });
  }

  const updated = await prisma.booking.update({ where: { id }, data: { status: transition.status } });

  if (action === "cancel") {
    const notifyEmail = isMusician ? booking.venue.user.email : booking.musician.user.email;
    const notifyName = isMusician ? booking.venue.venueName : booking.musician.stageName;
    const otherPartyName = isMusician ? booking.musician.stageName : booking.venue.venueName;
    if (notifyEmail) {
      sendBookingCancelledEmail({ email: notifyEmail, name: notifyName }, { otherPartyName, eventDate: booking.eventDate }).catch(
        (err) => log.error({ err }, "Failed to send booking cancelled email")
      );
    }
  }

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: `booking_${action}`,
    category: "booking",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "Booking",
    targetId: id,
  });

  return NextResponse.json({ success: true, data: updated });
}

async function handleNegotiatedAction({
  booking,
  action,
  counterFee,
  isMusician,
  session,
  requestId: id,
}: {
  booking: NonNullable<Awaited<ReturnType<typeof prisma.booking.findUnique>>> & {
    musician: { stageName: string; user: { email: string | null } };
    venue: { venueName: string; user: { email: string | null } };
  };
  action: string;
  counterFee?: number;
  isMusician: boolean;
  session: Session;
  requestId: string;
}) {
  const requestMetadata = await getRequestMetadata();

  async function logAndRespond(status: typeof booking.status, extra: Record<string, unknown> = {}) {
    const updated = await prisma.booking.findUniqueOrThrow({ where: { id } });
    await writeAuditLog({
      event: `booking_${action}`,
      category: "booking",
      level: "info",
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      requestId: requestMetadata.requestId,
      targetType: "Booking",
      targetId: id,
      metadata: extra,
    });
    return NextResponse.json({ success: true, data: updated });
  }

  if (action === "cancel") {
    if (booking.status !== "pending" && booking.status !== "accepted") {
      return NextResponse.json({ success: false, message: "This booking can no longer be cancelled." }, { status: 400 });
    }
    if (booking.stripePaymentIntentId && booking.paymentStatus !== "paid") {
      await releaseHold(booking.stripePaymentIntentId);
    }
    await prisma.booking.update({
      where: { id },
      data: { status: "cancelled", negotiationStatus: "none", paymentStatus: booking.paymentStatus === "paid" ? "paid" : "cancelled" },
    });
    const notifyEmail = isMusician ? booking.venue.user.email : booking.musician.user.email;
    const notifyName = isMusician ? booking.venue.venueName : booking.musician.stageName;
    const otherPartyName = isMusician ? booking.musician.stageName : booking.venue.venueName;
    if (notifyEmail) {
      sendBookingCancelledEmail({ email: notifyEmail, name: notifyName }, { otherPartyName, eventDate: booking.eventDate }).catch(
        (err) => log.error({ err }, "Failed to send booking cancelled email")
      );
    }
    return logAndRespond("cancelled");
  }

  if (action === "accept") {
    if (!isMusician || booking.negotiationStatus !== "pending_response") {
      return NextResponse.json({ success: false, message: "This booking is not awaiting your response." }, { status: 400 });
    }
    return captureAndConfirm(booking, requestMetadata, session, id, "accept");
  }

  if (action === "decline") {
    if (!isMusician || booking.negotiationStatus !== "pending_response") {
      return NextResponse.json({ success: false, message: "This booking is not awaiting your response." }, { status: 400 });
    }
    if (booking.stripePaymentIntentId) await releaseHold(booking.stripePaymentIntentId);
    await prisma.booking.update({
      where: { id },
      data: { status: "declined", negotiationStatus: "none", paymentStatus: "cancelled" },
    });
    if (booking.venue.user.email) {
      sendBookingDeclinedEmail(
        { email: booking.venue.user.email, name: booking.venue.venueName },
        { artistName: booking.musician.stageName, eventDate: booking.eventDate }
      ).catch((err) => log.error({ err }, "Failed to send booking declined email"));
    }
    return logAndRespond("declined");
  }

  if (action === "counter") {
    if (!isMusician || booking.negotiationStatus !== "pending_response") {
      return NextResponse.json({ success: false, message: "This booking is not awaiting your response." }, { status: 400 });
    }
    if (counterFee === undefined || counterFee <= 0) {
      return NextResponse.json({ success: false, message: "A counter-offer amount is required." }, { status: 400 });
    }
    await prisma.booking.update({
      where: { id },
      data: {
        negotiationStatus: "counter_pending",
        proposedFee: counterFee,
        proposedByUserId: session.user.id,
        responseDeadline: new Date(Date.now() + NEGOTIATION_RESPONSE_WINDOW_MS),
      },
    });
    return logAndRespond("pending", { counterFee });
  }

  if (action === "accept-counter") {
    if (isMusician || booking.negotiationStatus !== "counter_pending") {
      return NextResponse.json({ success: false, message: "There is no pending counter-offer to accept." }, { status: 400 });
    }
    return captureAndConfirm(booking, requestMetadata, session, id, "accept-counter");
  }

  if (action === "decline-counter") {
    if (isMusician || booking.negotiationStatus !== "counter_pending") {
      return NextResponse.json({ success: false, message: "There is no pending counter-offer to decline." }, { status: 400 });
    }
    // Revert to the original offer; the musician gets a fresh window to
    // accept/decline/counter it again. The original hold is untouched since
    // counters never altered it until accepted.
    await prisma.booking.update({
      where: { id },
      data: {
        negotiationStatus: "pending_response",
        proposedFee: booking.fee,
        proposedByUserId: null,
        responseDeadline: new Date(Date.now() + NEGOTIATION_RESPONSE_WINDOW_MS),
      },
    });
    return logAndRespond("pending");
  }

  if (action === "complete") {
    if (!isMusician || booking.status !== "accepted") {
      return NextResponse.json({ success: false, message: "This action is not allowed for the booking's current state" }, { status: 400 });
    }
    await prisma.booking.update({ where: { id }, data: { status: "completed" } });
    return logAndRespond("completed");
  }

  return NextResponse.json({ success: false, message: "Unsupported action" }, { status: 400 });
}

/** Shared by both a direct "accept" and a venue's "accept-counter": cancels any existing hold and places + captures a fresh one at the currently agreed fee, per policy that every agreed amount gets a brand new hold. */
async function captureAndConfirm(
  booking: NonNullable<Awaited<ReturnType<typeof prisma.booking.findUnique>>> & {
    musician: { stageName: string; user: { email: string | null } };
    venue: { venueName: string; user: { email: string | null } };
  },
  requestMetadata: Awaited<ReturnType<typeof getRequestMetadata>>,
  session: Session,
  id: string,
  action: string
) {
  if (!booking.stripeCustomerId || !booking.stripePaymentMethodId) {
    return NextResponse.json(
      { success: false, message: "This booking has no payment method on file and cannot be accepted." },
      { status: 400 }
    );
  }

  const agreedFee = booking.proposedFee ?? booking.fee;
  // A countered fee keeps the same deposit share as the original request.
  const depositPercent = booking.fee > 0 ? Math.round((booking.depositAmount / booking.fee) * 100) : undefined;
  const plan = planPayment({ structure: booking.paymentStructure, fee: agreedFee, currency: booking.currency, depositPercent });

  if (booking.stripePaymentIntentId) {
    await releaseHold(booking.stripePaymentIntentId);
  }

  let paymentIntent: Stripe.PaymentIntent;
  let fees: ReturnType<typeof import("@/lib/marketplace-fees").calculateMarketplaceFees>;
  try {
    const result = await placeHold({
      customerId: booking.stripeCustomerId,
      paymentMethodId: booking.stripePaymentMethodId,
      fee: plan.firstChargeFee,
      currency: booking.currency,
    });
    paymentIntent = result.paymentIntent;
    fees = result.fees;
    paymentIntent = await captureHold(paymentIntent.id);
  } catch (error) {
    const stripeError = error as Stripe.errors.StripeError;
    log.warn({ err: error, bookingId: id }, "Capture at agreed fee failed");

    await prisma.booking.update({ where: { id }, data: { paymentStatus: "failed" } });

    await writeAuditLog({
      event: "payment_charge_failed",
      category: "payment",
      level: "warn",
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      requestId: requestMetadata.requestId,
      targetType: "Booking",
      targetId: id,
      metadata: { reason: stripeError?.code ?? "unknown" },
    });

    if (booking.venue.user.email) {
      sendPaymentFailedEmail(
        { email: booking.venue.user.email, name: booking.venue.venueName },
        { artistName: booking.musician.stageName, eventDate: booking.eventDate }
      ).catch((err) => log.error({ err }, "Failed to send payment failed email"));
    }

    return NextResponse.json(
      { success: false, message: "The venue's payment method was declined. The booking has not been confirmed." },
      { status: 402 }
    );
  }

  const payoutReleaseAt = new Date(combineEventDateAndEndTime(booking.eventDate, booking.endTime).getTime() + 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data: {
        status: "accepted",
        negotiationStatus: "none",
        proposedByUserId: null,
        fee: agreedFee,
        depositAmount: booking.paymentStructure === "deposit_balance" ? plan.firstChargeFee : booking.depositAmount,
        balanceDueAt: booking.paymentStructure === "deposit_balance" ? balanceDueAt(combineEventDateAndStartTime(booking.eventDate, booking.startTime)) : null,
        platformFeeRate: fees.platformFeeRate,
        platformFeeAmount: fees.platformFeeAmount,
        processorFeeEstimate: fees.processorFeeEstimate,
        totalChargeAmount: fees.totalChargeAmount,
        netPayoutAmount: fees.artistPayoutAmount,
        paymentStatus: "paid",
        stripePaymentIntentId: paymentIntent.id,
        payoutReleaseAt,
      },
    });

    await tx.marketplaceTransaction.create({
      data: {
        bookingId: id,
        provider: "stripe",
        providerPaymentId: paymentIntent.id,
        transactionType: booking.paymentStructure === "deposit_balance" ? "deposit" : "full",
        performanceFee: plan.firstChargeFee,
        platformFeeRate: fees.platformFeeRate,
        platformFeeAmount: fees.platformFeeAmount,
        processorFeeEstimate: fees.processorFeeEstimate,
        totalChargeAmount: fees.totalChargeAmount,
        artistPayoutAmount: fees.artistPayoutAmount,
        currency: booking.currency,
        status: "paid",
        paidAt: new Date(),
      },
    });
  });

  const updated = await prisma.booking.findUniqueOrThrow({ where: { id } });

  if (booking.venue.user.email) {
    sendBookingAcceptedEmail(
      { email: booking.venue.user.email, name: booking.venue.venueName },
      { artistName: booking.musician.stageName, eventDate: booking.eventDate, totalChargeAmount: updated.totalChargeAmount, currency: updated.currency }
    ).catch((err) => log.error({ err }, "Failed to send booking accepted email"));
  }

  await writeAuditLog({
    event: `booking_${action}`,
    category: "booking",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "Booking",
    targetId: id,
    metadata: { agreedFee },
  });

  return NextResponse.json({ success: true, data: updated });
}
