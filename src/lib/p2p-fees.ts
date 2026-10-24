import type { MarketplaceFeeBreakdown } from "@/types";
import { DEFAULT_PROCESSOR_PERCENT_RATE, DEFAULT_PROCESSOR_FIXED_FEE } from "@/lib/marketplace-fees";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * P2P deals never carry a platform fee — platformFeeAmount is always 0, by
 * design, not by parameter. This is a separate function from
 * calculateMarketplaceFees() specifically so the "no fee, ever" guarantee
 * can't regress via a shared default. Stripe's own processing fee is still
 * real money leaving the charge, so it's grossed up the same way venue
 * charges are (see calculateMarketplaceFees for the derivation), unless the
 * caller opts the payer out of covering it.
 */
export function calculatePeerPayoutFees(
  amount: number,
  options: { currency?: string; passProcessorFeeToPayer?: boolean } = {}
): MarketplaceFeeBreakdown {
  const passProcessorFeeToPayer = options.passProcessorFeeToPayer ?? true;
  const totalChargeAmount = passProcessorFeeToPayer
    ? roundMoney((amount + DEFAULT_PROCESSOR_FIXED_FEE) / (1 - DEFAULT_PROCESSOR_PERCENT_RATE))
    : roundMoney(amount);
  const processorFeeEstimate = roundMoney(totalChargeAmount - amount);

  return {
    performanceFee: roundMoney(amount),
    platformFeeRate: 0,
    platformFeeAmount: 0,
    processorFeeEstimate,
    totalChargeAmount,
    artistPayoutAmount: roundMoney(amount),
    currency: options.currency ?? "EUR",
  };
}
