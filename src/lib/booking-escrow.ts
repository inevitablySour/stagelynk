import type Stripe from "stripe";
import { stripe, toMinorUnits } from "@/lib/stripe";
import { calculateMarketplaceFees } from "@/lib/marketplace-fees";

/**
 * Places a fresh manual-capture pre-authorization hold for a (possibly new)
 * fee amount. Used both at initial booking request and whenever a
 * counter-offer is actually agreed to — per policy, EVERY agreed amount
 * (higher or lower than any prior hold) gets a brand new hold rather than
 * adjusting an existing one, so the venue's card is always freshly verified
 * at the moment of agreement. See .claude/skills/stripe-connect/SKILL.md.
 */
export async function placeHold(params: {
  customerId: string;
  paymentMethodId: string;
  fee: number;
  currency: string;
}) {
  const fees = calculateMarketplaceFees(params.fee, { currency: params.currency });
  const paymentIntent = await stripe.paymentIntents.create({
    amount: toMinorUnits(fees.totalChargeAmount),
    currency: params.currency.toLowerCase(),
    customer: params.customerId,
    payment_method: params.paymentMethodId,
    capture_method: "manual",
    off_session: true,
    confirm: true,
  });
  return { paymentIntent, fees };
}

/** Cancels an uncaptured hold. Safe to call on a PI already canceled/captured — Stripe rejects it and we treat that as a no-op. */
export async function releaseHold(paymentIntentId: string) {
  try {
    await stripe.paymentIntents.cancel(paymentIntentId);
  } catch (error) {
    const stripeError = error as Stripe.errors.StripeError;
    if (stripeError.code !== "payment_intent_unexpected_state") throw error;
  }
}

/** Captures an existing hold in full, confirming the charge. */
export async function captureHold(paymentIntentId: string) {
  return stripe.paymentIntents.capture(paymentIntentId);
}
