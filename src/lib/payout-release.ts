import { prisma } from "@/lib/db";
import { stripe, toMinorUnits } from "@/lib/stripe";
import { writeAuditLog } from "@/lib/audit-log";
import { sendPayoutReleasedEmail } from "@/lib/email-templates";
import { getLogger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

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
  if (!booking.stripePaymentIntentId) {
    throw new PayoutReleaseError("No payment was recorded for this booking.");
  }

  const musician = booking.musician;
  if (!musician.stripeConnectAccountId || !musician.stripePayoutsEnabled) {
    throw new PayoutReleaseError("The musician hasn't finished setting up their payout account yet.");
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
  const chargeId =
    typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : paymentIntent.latest_charge?.id;

  if (!chargeId) {
    throw new PayoutReleaseError("Unable to locate the original charge for this booking.");
  }

  const transfer = await stripe.transfers.create({
    amount: toMinorUnits(booking.netPayoutAmount),
    currency: booking.currency.toLowerCase(),
    destination: musician.stripeConnectAccountId,
    source_transaction: chargeId,
    description: `Payout for booking ${booking.id}`,
    metadata: { bookingId: booking.id },
  });

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { payoutStatus: "paid" } });

    const transaction = await tx.marketplaceTransaction.findFirst({
      where: { bookingId: booking.id, providerPaymentId: booking.stripePaymentIntentId! },
    });

    if (transaction) {
      await tx.payout.create({
        data: {
          transactionId: transaction.id,
          musicianId: musician.id,
          providerPayoutId: transfer.id,
          amount: booking.netPayoutAmount,
          currency: booking.currency,
          status: "paid",
          paidAt: new Date(),
        },
      });
    }
  });

  await writeAuditLog({
    event: options.event,
    category: "payment",
    level: "info",
    actorUserId: options.actorUserId,
    targetType: "Booking",
    targetId: booking.id,
    metadata: { transferId: transfer.id, amount: booking.netPayoutAmount },
  });

  if (musician.user.email) {
    sendPayoutReleasedEmail(
      { email: musician.user.email, name: musician.stageName },
      { venueName: booking.venue.venueName, amount: booking.netPayoutAmount, currency: booking.currency }
    ).catch((err) => log.error({ err }, "Failed to send payout released email"));
  }

  return transfer;
}
