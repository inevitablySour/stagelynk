import type { MarketplaceFeeBreakdown } from "@/types";
import { calculateMarketplaceFees } from "@/lib/marketplace-fees";

/**
 * Cash collaboration deals between two creatives carry a reduced platform
 * fee: half the marketplace rate by default. The payer covers the fee (and
 * Stripe's processing fee) on top of the deal amount, so the payee always
 * receives the full amount. Deals that look like venue/client work are
 * charged the standard marketplace rate instead (see p2p-policy.ts).
 */
export const P2P_PLATFORM_FEE_RATE = Number(process.env.NEXT_PUBLIC_P2P_PLATFORM_FEE_RATE ?? 0.025);

export function calculatePeerPayoutFees(
  amount: number,
  options: { currency?: string; passProcessorFeeToPayer?: boolean; platformFeeRate?: number } = {}
): MarketplaceFeeBreakdown {
  return calculateMarketplaceFees(amount, {
    currency: options.currency,
    platformFeeRate: options.platformFeeRate ?? P2P_PLATFORM_FEE_RATE,
    passProcessorFeeToVenue: options.passProcessorFeeToPayer,
  });
}
