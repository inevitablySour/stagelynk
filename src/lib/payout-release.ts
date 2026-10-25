import { prisma } from "@/lib/db";
import { stripe, toMinorUnits } from "@/lib/stripe";
import { writeAuditLog } from "@/lib/audit-log";
import { sendPayoutReleasedEmail } from "@/lib/email-templates";
import { getLogger } from "@/lib/logger";
import { calculateMarketplaceFees } from "@/lib/marketplace-fees";
import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";

const log = getLogger("payout-release");

export class PayoutReleaseError extends Error {}

type BookingWithMusicianAndVenue = Prisma.BookingGetPayload<{
  include: {
    musician: { include: { user: { select: { email: true } } } };
    venue: { select: { venueName: true } };
  };
}>;

/**
 * Creates the actual Stripe Transfer to the musician's Connect account for a
 * completed, paid booking (separate charges & transfers model — the
 * transfer draws from the original charge via `source_transaction`). Shared
 * by the venue-triggered "release now" route and the 24h auto-release cron.
 * See .claude/skills/stripe-connect/SKILL.md.
 */
export async function releasePayoutForBooking(
  booking: BookingWithMusicianAndVenue,
  options: { event: "payout_released_early" | "payout_released_auto"; actorUserId?: string }
) {
  if (booking.status !== "completed") {
    throw new PayoutReleaseError("Only completed bookings can be paid out.");
  }
  if (booking.payoutStatus !== "pending") {
    throw new PayoutReleaseError("This booking has already been paid out or is not eligible.");
  }
  if (booking.paymentStructure === "milestone") {
    throw new PayoutReleaseError("Milestone bookings are paid out as each milestone is approved.");
  }
  if (booking.paymentStructure === "deposit_balance" && (!booking.balanceChargedAt || !booking.balancePaymentIntentId)) {
    throw new PayoutReleaseError("The balance for this booking hasn't been paid yet.");
  }
  if (!booking.stripePaymentIntentId) {
    throw new PayoutReleaseError("No payment was recorded for this booking.");
  }

  const musician = booking.musician;
  if (!musician.stripeConnectAccountId || !musician.stripePayoutsEnabled) {
    throw new PayoutReleaseError("The musician hasn't finished setting up their payout account yet.");
  }

  const openDispute = await prisma.bookingDispute.findFirst({
    where: {
      bookingId: booking.id,
      status: {
        notIn: ["resolved_refund_full", "resolved_refund_partial", "resolved_no_refund"],
      },
    },
  });
  if (openDispute) {
    throw new PayoutReleaseError("This booking has an open dispute and cannot be paid out yet.");
  }

  // One transfer per charge, each drawing from its own charge via
  // source_transaction. A deposit_balance booking has two charges.
  const charges = [{ intentId: booking.stripePaymentIntentId, amount: booking.netPayoutAmount }];
  if (booking.paymentStructure === "deposit_balance") {
    const balance = calculateMarketplaceFees(booking.fee - booking.depositAmount, { currency: booking.currency, platformFeeRate: booking.platformFeeRate });
    charges.push({ intentId: booking.balancePaymentIntentId!, amount: balance.artistPayoutAmount });
  }

  const transfers: Stripe.Transfer[] = [];
  for (const charge of charges) {
    const paymentIntent = await stripe.paymentIntents.retrieve(charge.intentId);
    const chargeId =
      typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : paymentIntent.latest_charge?.id;
    if (!chargeId) {
      throw new PayoutReleaseError("Unable to locate the original charge for this booking.");
    }
    transfers.push(await stripe.transfers.create({
      amount: toMinorUnits(charge.amount),
      currency: booking.currency.toLowerCase(),
      destination: musician.stripeConnectAccountId,
      source_transaction: chargeId,
      description: `Payout for booking ${booking.id}`,
      metadata: { bookingId: booking.id },
    }, { idempotencyKey: `payout-${booking.id}-${charge.intentId}` }));
  }
  const transfer = transfers[0];
  const totalNet = charges.reduce((sum, c) => sum + c.amount, 0);

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { payoutStatus: "paid" } });

    for (const [index, charge] of charges.entries()) {
      const transaction = await tx.marketplaceTransaction.findFirst({
        where: { bookingId: booking.id, providerPaymentId: charge.intentId },
      });
      if (transaction) {
        await tx.payout.create({
          data: {
            transactionId: transaction.id,
            musicianId: musician.id,
            providerPayoutId: transfers[index].id,
            amount: charge.amount,
            currency: booking.currency,
            status: "paid",
            paidAt: new Date(),
          },
        });
      }
    }
  });

  await writeAuditLog({
    event: options.event,
    category: "payment",
    level: "info",
    actorUserId: options.actorUserId,
    targetType: "Booking",
    targetId: booking.id,
    metadata: { transferId: transfer.id, transferIds: transfers.map((t) => t.id), amount: totalNet },
  });

  if (musician.user.email) {
    sendPayoutReleasedEmail(
      { email: musician.user.email, name: musician.stageName },
      { venueName: booking.venue.venueName, amount: totalNet, currency: booking.currency }
    ).catch((err) => log.error({ err }, "Failed to send payout released email"));
  }

  return transfer;
}
