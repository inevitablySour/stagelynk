import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

export const stripe = new Stripe(secretKey, {
  apiVersion: "2026-09-30.endive",
});

/** Converts a major-unit amount (e.g. 45.50 EUR) to Stripe's minor-unit integer (e.g. 4550 cents). */
export function toMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

/** Converts a Stripe minor-unit integer back to a major-unit amount. */
export function fromMinorUnits(amount: number) {
  return Math.round(amount) / 100;
}
