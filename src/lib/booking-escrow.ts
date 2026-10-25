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

/**
 * Refunds a captured charge, full or partial, as part of dispute resolution.
 * Safe whether or not a transfer has already been made to the musician's
 * connected account — Stripe allows refunding the original charge
 * regardless, drawing the refund from the platform's own balance per the
 * separate-charges-and-transfers model. See .claude/skills/stripe-connect/SKILL.md.
 */
export async function refundCharge(paymentIntentId: string, amount?: number) {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amount !== undefined ? { amount: toMinorUnits(amount) } : {}),
  });
}

/**
 * Refunds a booking across every charge it was paid with (a deposit_balance
 * booking has two; a milestone booking has one per paid milestone). A full
 * refund returns every charge; a partial refund is taken from the most
 * recent charge first, spilling into earlier ones.
 */
export async function refundBookingPayments(
  charges: { providerPaymentId: string | null; totalChargeAmount: number }[],
  amount?: number
) {
  const paid = charges.filter((c): c is { providerPaymentId: string; totalChargeAmount: number } => Boolean(c.providerPaymentId)).reverse();
  if (amount === undefined) {
    for (const charge of paid) await refundCharge(charge.providerPaymentId);
    return;
  }
  let remaining = amount;
  for (const charge of paid) {
    if (remaining <= 0) break;
    const portion = Math.min(remaining, charge.totalChargeAmount);
    await refundCharge(charge.providerPaymentId, portion);
    remaining = Math.round((remaining - portion) * 100) / 100;
  }
}
