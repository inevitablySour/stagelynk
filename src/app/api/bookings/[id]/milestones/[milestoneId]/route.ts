import { NextResponse } from "next/server";
import { z } from "zod/v4";
import type Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe, toMinorUnits } from "@/lib/stripe";
import { calculateMarketplaceFees } from "@/lib/marketplace-fees";
import { writeAuditLog } from "@/lib/audit-log";
import { sendMilestoneEmail } from "@/lib/email-templates";
import { getLogger } from "@/lib/logger";

const log = getLogger("api-booking-milestones");
const bodySchema = z.object({ action: z.enum(["submit", "approve"]) });

/**
 * Marketplace milestone bookings. The artist submits a milestone; the client
 * approves it, which charges just that slice (amount + the platform fee and
 * processing fee, via calculateMarketplaceFees) and transfers the milestone
 * amount to the artist. Separate charges and transfers, no application_fee_amount.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const { id, milestoneId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { order: "asc" } },
      musician: { select: { id: true, userId: true, stageName: true, stripeConnectAccountId: true, stripePayoutsEnabled: true, user: { select: { email: true } } } },
      venue: { select: { id: true, userId: true, venueName: true, user: { select: { email: true } } } },
    },
  });
  if (!booking || booking.paymentStructure !== "milestone") return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  const isMusician = session.user.role === "musician" && booking.musician.userId === session.user.id;
  const isVenue = session.user.role === "venue" && booking.venue.userId === session.user.id;
  if (!isMusician && !isVenue) return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  if (booking.status !== "accepted" && booking.status !== "completed") return NextResponse.json({ success: false, message: "This booking isn't active." }, { status: 400 });

  const milestone = booking.milestones.find((m) => m.id === milestoneId);
  if (!milestone) return NextResponse.json({ success: false, message: "Milestone not found." }, { status: 404 });

  const openDispute = await prisma.bookingDispute.findFirst({ where: { bookingId: id, status: { notIn: ["resolved_refund_full", "resolved_refund_partial", "resolved_no_refund"] } } });
  if (openDispute) return NextResponse.json({ success: false, message: "This booking has an open dispute." }, { status: 409 });

  if (parsed.data.action === "submit") {
    if (!isMusician) return NextResponse.json({ success: false, message: "Only the artist can submit a milestone." }, { status: 403 });
    const claimed = await prisma.bookingMilestone.updateMany({ where: { id: milestoneId, status: "pending" }, data: { status: "submitted", submittedAt: new Date() } });
    if (!claimed.count) return NextResponse.json({ success: false, message: "This milestone has already been submitted." }, { status: 409 });
    if (booking.venue.user.email) {
      sendMilestoneEmail({ email: booking.venue.user.email, name: booking.venue.venueName }, {
        heading: "Milestone ready for review",
        message: `${booking.musician.stageName} submitted "${milestone.label}" for ${booking.title}. Approve it to release payment.`,
      }).catch((err) => log.error({ err }, "Milestone submit email failed"));
    }
    return NextResponse.json({ success: true });
  }

  // approve: the client pays this slice
  if (!isVenue) return NextResponse.json({ success: false, message: "Only the client can approve a milestone." }, { status: 403 });
  if (!booking.musician.stripeConnectAccountId || !booking.musician.stripePayoutsEnabled) {
    return NextResponse.json({ success: false, message: "The artist hasn't finished payout setup yet." }, { status: 400 });
  }
  if (!booking.stripeCustomerId || !booking.stripePaymentMethodId) {
    return NextResponse.json({ success: false, message: "No saved card for this booking." }, { status: 400 });
  }
  // Claim the milestone first so a double click can't charge twice.
  const claimed = await prisma.bookingMilestone.updateMany({ where: { id: milestoneId, status: "submitted" }, data: { status: "approved", approvedAt: new Date() } });
  if (!claimed.count) return NextResponse.json({ success: false, message: "This milestone isn't waiting for approval." }, { status: 409 });

  const fees = calculateMarketplaceFees(milestone.amount, { currency: booking.currency, platformFeeRate: booking.platformFeeRate });
  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.create({
      amount: toMinorUnits(fees.totalChargeAmount), currency: booking.currency.toLowerCase(),
      customer: booking.stripeCustomerId, payment_method: booking.stripePaymentMethodId,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      confirm: true, off_session: true,
      metadata: { bookingId: booking.id, milestoneId, kind: "milestone" },
    }, { idempotencyKey: `milestone-${milestoneId}` });
    if (intent.status !== "succeeded") throw new Error(`Charge status ${intent.status}`);
    const charge = typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id;
    if (!charge) throw new Error("Charge not found");
    const transfer = await stripe.transfers.create({
      amount: toMinorUnits(fees.artistPayoutAmount), currency: booking.currency.toLowerCase(),
      destination: booking.musician.stripeConnectAccountId, source_transaction: charge,
      description: `Milestone "${milestone.label}" for booking ${booking.id}`, metadata: { bookingId: booking.id, milestoneId },
    }, { idempotencyKey: `milestone-transfer-${milestoneId}` });

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.bookingMilestone.update({ where: { id: milestoneId }, data: { status: "paid", paidAt: now, stripePaymentIntentId: intent.id } });
      const transaction = await tx.marketplaceTransaction.create({
        data: {
          bookingId: booking.id, provider: "stripe", providerPaymentId: intent.id, transactionType: "milestone",
          performanceFee: milestone.amount, platformFeeRate: fees.platformFeeRate, platformFeeAmount: fees.platformFeeAmount,
          processorFeeEstimate: fees.processorFeeEstimate, totalChargeAmount: fees.totalChargeAmount,
          artistPayoutAmount: fees.artistPayoutAmount, currency: booking.currency, status: "paid", paidAt: now,
        },
      });
      await tx.payout.create({ data: { transactionId: transaction.id, musicianId: booking.musicianId, providerPayoutId: transfer.id, amount: fees.artistPayoutAmount, currency: booking.currency, status: "paid", paidAt: now } });
      if (await tx.bookingMilestone.count({ where: { bookingId: booking.id, status: { not: "paid" } } }) === 0) {
        await tx.booking.update({ where: { id: booking.id }, data: { paymentStatus: "paid", payoutStatus: "paid" } });
      }
    });
    await writeAuditLog({ event: "booking_milestone_paid", category: "payment", level: "info", actorUserId: session.user.id, targetType: "BookingMilestone", targetId: milestoneId, metadata: { amount: fees.totalChargeAmount } });
    if (booking.musician.user.email) {
      sendMilestoneEmail({ email: booking.musician.user.email, name: booking.musician.stageName }, {
        heading: "Milestone paid", message: `"${milestone.label}" for ${booking.title} was approved and ${fees.artistPayoutAmount.toFixed(2)} ${booking.currency} is on its way to you.`,
      }).catch((err) => log.error({ err }, "Milestone paid email failed"));
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    log.warn({ err: error, milestoneId }, "Milestone charge failed");
    // Return the milestone to the review queue so the client can retry.
    await prisma.bookingMilestone.updateMany({ where: { id: milestoneId, status: "approved" }, data: { status: "submitted", approvedAt: null } });
    return NextResponse.json({ success: false, message: "The charge couldn't be completed. Check the saved card and try again." }, { status: 402 });
  }
}
