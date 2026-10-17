import type { MarketplaceFeeBreakdown } from "@/types";

export const DEFAULT_PLATFORM_FEE_RATE = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_RATE ?? 0.05);

// Stripe's published rate for standard EEA cards on a Netherlands-established
// account (stripe.com/pricing, checked 2026-10-13). This is an ESTIMATE used
// to gross up the charge so the platform doesn't silently absorb Stripe's fee
// — the real fee Stripe deducts depends on the card's actual origin, and will
// be higher than this estimate for non-EEA cards:
//   EEA standard: 1.5% + €0.25 (used below)
//   EEA premium/Amex: 2.8% + €0.25
//   UK-issued: 2.5% + €0.25
//   Non-European: 3.15% + €0.25 (+2% if currency conversion is needed)
// If venues frequently pay with non-EEA cards, this estimate will undercount
// the same way the old UK-rate estimate did before the 2026-10-13 fix.
export const DEFAULT_PROCESSOR_PERCENT_RATE = Number(process.env.NEXT_PUBLIC_PROCESSOR_PERCENT_RATE ?? 0.015);
export const DEFAULT_PROCESSOR_FIXED_FEE = Number(process.env.NEXT_PUBLIC_PROCESSOR_FIXED_FEE ?? 0.25);

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function calculateMarketplaceFees(
  performanceFee: number,
  options: {
    currency?: string;
    platformFeeRate?: number;
    passProcessorFeeToVenue?: boolean;
  } = {}
): MarketplaceFeeBreakdown {
  const platformFeeRate = options.platformFeeRate ?? DEFAULT_PLATFORM_FEE_RATE;
  const platformFeeAmount = roundMoney(performanceFee * platformFeeRate);
  const subtotal = performanceFee + platformFeeAmount;

  // Stripe's processing fee is deducted from the amount actually charged, not
  // from the subtotal before it. To pass the full processor fee to the venue
  // without the platform absorbing the difference, gross up the subtotal so
  // that `totalChargeAmount * rate + fixedFee` equals the fee Stripe deducts
  // from that same totalChargeAmount:
  //   total = subtotal + (total * rate + fixedFee)
  //   total = (subtotal + fixedFee) / (1 - rate)
  const passProcessorFeeToVenue = options.passProcessorFeeToVenue ?? true;
  const totalChargeAmount = passProcessorFeeToVenue
    ? roundMoney((subtotal + DEFAULT_PROCESSOR_FIXED_FEE) / (1 - DEFAULT_PROCESSOR_PERCENT_RATE))
    : roundMoney(subtotal);
  const processorFeeEstimate = roundMoney(totalChargeAmount - subtotal);

  return {
    performanceFee: roundMoney(performanceFee),
    platformFeeRate,
    platformFeeAmount,
    processorFeeEstimate,
    totalChargeAmount,
    artistPayoutAmount: roundMoney(performanceFee),
    currency: options.currency ?? "EUR",
  };
}
