import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe, toMinorUnits } from "@/lib/stripe";
import { calculateMarketplaceFees } from "@/lib/marketplace-fees";
import { writeAuditLog } from "@/lib/audit-log";
import { sendBalanceChargedEmail, sendBalanceFailedEmail } from "@/lib/email-templates";
import { getLogger } from "@/lib/logger";

const log = getLogger("balance-charges");
const RETRY_AFTER_MS = 6 * 60 * 60 * 1000;

/**
 * Charges the remaining balance of a deposit_balance booking, about 48 hours
 * before the event. Off-session on the venue's saved card; a failure is
 * recorded and retried every few hours until the event starts.
 */
export async function chargeBookingBalance(bookingId: string, now = new Date()) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { musician: { select: { stageName: true, user: { select: { email: true } } } }, venue: { select: { venueName: true, user: { select: { email: true } } } } },
  });
  if (booking.paymentStructure !== "deposit_balance" || booking.balanceChargedAt || booking.paymentStatus !== "paid" || !["accepted", "completed"].includes(booking.status)) return { charged: false as const, reason: "not_due" };
  if (!booking.balanceDueAt || booking.balanceDueAt > now) return { charged: false as const, reason: "not_due" };
  if (booking.balanceFailedAt && now.getTime() - booking.balanceFailedAt.getTime() < RETRY_AFTER_MS) return { charged: false as const, reason: "retry_later" };
  if (!booking.stripeCustomerId || !booking.stripePaymentMethodId) return { charged: false as const, reason: "no_payment_method" };

  const balanceFee = Math.round((booking.fee - booking.depositAmount) * 100) / 100;
  if (balanceFee <= 0) return { charged: false as const, reason: "no_balance" };
  const fees = calculateMarketplaceFees(balanceFee, { currency: booking.currency, platformFeeRate: booking.platformFeeRate });

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.create({
      amount: toMinorUnits(fees.totalChargeAmount),
      currency: booking.currency.toLowerCase(),
      customer: booking.stripeCustomerId,
      payment_method: booking.stripePaymentMethodId,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      confirm: true,
      off_session: true,
      metadata: { bookingId: booking.id, kind: "balance" },
    }, { idempotencyKey: `balance-${booking.id}-${booking.balanceFailedAt?.getTime() ?? 0}` });
  } catch (error) {
    return recordFailure(booking, (error as Stripe.errors.StripeError)?.code ?? "unknown", now);
  }
  if (intent.status !== "succeeded") {
    if (intent.status !== "canceled") await stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
    return recordFailure(booking, intent.status, now);
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { balanceChargedAt: now, balanceFailedAt: null, balancePaymentIntentId: intent.id } });
    await tx.marketplaceTransaction.create({
      data: {
        bookingId: booking.id, provider: "stripe", providerPaymentId: intent.id, transactionType: "balance",
        performanceFee: balanceFee, platformFeeRate: fees.platformFeeRate, platformFeeAmount: fees.platformFeeAmount,
        processorFeeEstimate: fees.processorFeeEstimate, totalChargeAmount: fees.totalChargeAmount,
        artistPayoutAmount: fees.artistPayoutAmount, currency: booking.currency, status: "paid", paidAt: now,
      },
    });
  });
  await writeAuditLog({ event: "booking_balance_charged", category: "payment", level: "info", targetType: "Booking", targetId: booking.id, metadata: { amount: fees.totalChargeAmount } });

  const message = { eventDate: booking.eventDate, amount: fees.totalChargeAmount, currency: booking.currency };
  if (booking.venue.user.email) sendBalanceChargedEmail({ email: booking.venue.user.email, name: booking.venue.venueName }, { ...message, otherPartyName: booking.musician.stageName }).catch((err) => log.error({ err }, "Balance email failed"));
  if (booking.musician.user.email) sendBalanceChargedEmail({ email: booking.musician.user.email, name: booking.musician.stageName }, { ...message, amount: fees.artistPayoutAmount, otherPartyName: booking.venue.venueName }).catch((err) => log.error({ err }, "Balance email failed"));
  return { charged: true as const, paymentIntentId: intent.id };
}

async function recordFailure(
  booking: { id: string; eventDate: Date; balanceFailedAt: Date | null; musician: { stageName: string; user: { email: string | null } }; venue: { venueName: string; user: { email: string | null } } },
  reason: string,
  now: Date
) {
  const firstFailure = !booking.balanceFailedAt;
  await prisma.booking.update({ where: { id: booking.id }, data: { balanceFailedAt: now } });
  await writeAuditLog({ event: "booking_balance_failed", category: "payment", level: "warn", targetType: "Booking", targetId: booking.id, metadata: { reason } });
  if (firstFailure) {
    if (booking.venue.user.email) sendBalanceFailedEmail({ email: booking.venue.user.email, name: booking.venue.venueName }, { otherPartyName: booking.musician.stageName, eventDate: booking.eventDate }).catch((err) => log.error({ err }, "Balance failure email failed"));
    if (booking.musician.user.email) sendBalanceFailedEmail({ email: booking.musician.user.email, name: booking.musician.stageName }, { otherPartyName: booking.venue.venueName, eventDate: booking.eventDate }).catch((err) => log.error({ err }, "Balance failure email failed"));
  }
  return { charged: false as const, reason };
}
