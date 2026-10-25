import assert from "node:assert/strict";
import test from "node:test";
import { calculatePeerPayoutFees, P2P_PLATFORM_FEE_RATE } from "../src/lib/p2p-fees";
import { calculateMarketplaceFees, DEFAULT_PLATFORM_FEE_RATE } from "../src/lib/marketplace-fees";

test("P2P cash deals carry half the marketplace fee and the payee gets the full amount", () => {
  const fees = calculatePeerPayoutFees(1000);
  assert.equal(P2P_PLATFORM_FEE_RATE, 0.025);
  assert.equal(fees.platformFeeAmount, 25);
  assert.equal(fees.artistPayoutAmount, 1000);
  assert.ok(fees.totalChargeAmount > 1025);
});

test("the standard rate can be applied to a P2P charge when guardrails trip", () => {
  const standard = calculatePeerPayoutFees(1000, { platformFeeRate: DEFAULT_PLATFORM_FEE_RATE });
  assert.deepEqual(standard, calculateMarketplaceFees(1000, { platformFeeRate: DEFAULT_PLATFORM_FEE_RATE }));
  assert.equal(standard.platformFeeAmount, 50);
});
