import type { MarketplaceFeeBreakdown } from "@/types";

export const DEFAULT_PLATFORM_FEE_RATE = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_RATE ?? 0.05);
export const DEFAULT_PROCESSOR_PERCENT_RATE = Number(process.env.NEXT_PUBLIC_PROCESSOR_PERCENT_RATE ?? 0.029);
export const DEFAULT_PROCESSOR_FIXED_FEE = Number(process.env.NEXT_PUBLIC_PROCESSOR_FIXED_FEE ?? 0.3);

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatMoney(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
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
  const processorFeeEstimate = roundMoney(subtotal * DEFAULT_PROCESSOR_PERCENT_RATE + DEFAULT_PROCESSOR_FIXED_FEE);
  const totalChargeAmount = roundMoney(subtotal + (options.passProcessorFeeToVenue ?? true ? processorFeeEstimate : 0));

  return {
    performanceFee: roundMoney(performanceFee),
    platformFeeRate,
    platformFeeAmount,
    processorFeeEstimate,
    totalChargeAmount,
    artistPayoutAmount: roundMoney(performanceFee),
    currency: options.currency ?? "GBP",
  };
}
