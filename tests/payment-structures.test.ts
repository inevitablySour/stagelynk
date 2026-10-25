import assert from "node:assert/strict";
import test from "node:test";
import { balanceDueAt, firstChargeFee, milestonesMatchFee, planPayment, splitDeposit, validateApplicationPayment } from "../src/lib/payment-structures";

test("a deposit booking charges the deposit now and the balance later, each with its own fees", () => {
  const plan = planPayment({ structure: "deposit_balance", fee: 1000, currency: "EUR", depositPercent: 30 });
  assert.equal(plan.firstChargeFee, 300);
  assert.equal(plan.balanceFee, 700);
  assert.equal(plan.first!.platformFeeAmount, 15);
  assert.equal(plan.balance!.platformFeeAmount, 35);
  assert.equal(plan.first!.artistPayoutAmount + plan.balance!.artistPayoutAmount, 1000);
});

test("full sum charges everything now and milestones charge nothing now", () => {
  assert.equal(planPayment({ structure: "full_sum", fee: 500, currency: "EUR" }).first!.performanceFee, 500);
  const milestone = planPayment({ structure: "milestone", fee: 500, currency: "EUR" });
  assert.equal(milestone.first, null);
  assert.equal(milestone.firstChargeFee, 0);
});

test("deposit split rounds to the cent and always sums to the fee", () => {
  const { deposit, balance } = splitDeposit(333.33, 30);
  assert.equal(Math.round((deposit + balance) * 100) / 100, 333.33);
});

test("balance is due 48 hours before the event starts", () => {
  const start = new Date("2026-12-20T20:00:00Z");
  assert.equal(balanceDueAt(start).toISOString(), "2026-12-18T20:00:00.000Z");
});

test("first charge fee follows the structure", () => {
  assert.equal(firstChargeFee({ paymentStructure: "deposit_balance", fee: 1000, depositAmount: 300 }), 300);
  assert.equal(firstChargeFee({ paymentStructure: "full_sum", fee: 1000, depositAmount: 0 }), 1000);
});

test("applicants may only pick an offered structure and must give milestones that add up", () => {
  assert.deepEqual(validateApplicationPayment(["full_sum"], { selectedPaymentStructure: "milestone" }, 100), { ok: false, message: "That payment structure isn't offered for this listing." });
  assert.equal(validateApplicationPayment(["milestone"], {}, 100).ok, false);
  assert.equal(validateApplicationPayment(["milestone"], { milestones: [{ label: "A", amount: 40 }, { label: "B", amount: 50 }] }, 100).ok, false);
  const ok = validateApplicationPayment(["full_sum", "milestone"], { selectedPaymentStructure: "milestone", milestones: [{ label: "A", amount: 40 }, { label: "B", amount: 60 }] }, 100);
  assert.equal(ok.ok, true);
  assert.equal(milestonesMatchFee([{ label: "A", amount: 33.33 }, { label: "B", amount: 66.67 }], 100), true);
  const single = validateApplicationPayment(["deposit_balance"], {}, 100);
  assert.equal(single.ok && single.structure, "deposit_balance");
});
