import type Stripe from "stripe";
import { stripe, toMinorUnits } from "@/lib/stripe";
import { calculatePeerPayoutFees } from "@/lib/p2p-fees";

/**
 * Charges the paying artist's saved card for a P2P deal (or milestone).
 * Manual capture, same separate-charges-and-transfers shape as bookings.
 * The payer is charged the deal amount plus a platform fee (reduced for
 * genuine collaboration, standard otherwise; see p2p-policy.ts) and Stripe's
 * processing fee. See
 * .claude/skills/stripe-connect/SKILL.md.
 */
export async function placePeerHold(params: {
  payerCustomerId: string;
  payerPaymentMethodId: string;
  amount: number;
  currency: string;
  platformFeeRate: number;
  metadata?: Record<string, string>;
}) {
  const fees = calculatePeerPayoutFees(params.amount, { currency: params.currency, platformFeeRate: params.platformFeeRate });
  const paymentIntent = await stripe.paymentIntents.create({
    amount: toMinorUnits(fees.totalChargeAmount),
    currency: params.currency.toLowerCase(),
    customer: params.payerCustomerId,
    payment_method: params.payerPaymentMethodId,
    capture_method: "manual",
    off_session: true,
    confirm: true,
    metadata: { kind: "p2p", platformFeeRate: String(params.platformFeeRate), ...params.metadata },
  });
  return { paymentIntent, fees };
}

export async function releasePeerHold(paymentIntentId: string) {
  try {
    await stripe.paymentIntents.cancel(paymentIntentId);
  } catch (error) {
    const stripeError = error as Stripe.errors.StripeError;
    if (stripeError.code !== "payment_intent_unexpected_state") throw error;
  }
}

export async function capturePeerHold(paymentIntentId: string) {
  return stripe.paymentIntents.capture(paymentIntentId);
}

/**
 * Transfers the full deal/milestone amount to the payee's Connect account.
 * The platform fee is retained by transferring the deal amount rather than
 * the whole charge (never via application_fee_amount). Draws
 * from the original charge via source_transaction, same as booking payouts.
 */
export async function transferToPeer(params: {
  paymentIntentId: string;
  payeeConnectAccountId: string;
  amount: number;
  currency: string;
  description: string;
}) {
  const paymentIntent = await stripe.paymentIntents.retrieve(params.paymentIntentId);
  const chargeId =
    typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : paymentIntent.latest_charge?.id;

  if (!chargeId) {
    throw new Error("Unable to locate the original charge for this P2P deal.");
  }

  return stripe.transfers.create({
    amount: toMinorUnits(params.amount),
    currency: params.currency.toLowerCase(),
    destination: params.payeeConnectAccountId,
    source_transaction: chargeId,
    description: params.description,
  });
}
