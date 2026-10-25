import type { PaymentStructure } from "@prisma/client";
import { calculateMarketplaceFees } from "@/lib/marketplace-fees";

/** Client-safe: no database imports. */
export const PAYMENT_STRUCTURE_LABELS: Record<PaymentStructure, string> = {
  full_sum: "Full sum",
  deposit_balance: "Deposit + balance",
  milestone: "Milestones",
};

export const PAYMENT_STRUCTURE_HINTS: Record<PaymentStructure, string> = {
  full_sum: "Paid in full when the booking is confirmed.",
  deposit_balance: "A deposit now, the balance charged about 48 hours before the event.",
  milestone: "Paid in instalments as each milestone is delivered and approved.",
};

export const PAYMENT_STRUCTURES = ["full_sum", "deposit_balance", "milestone"] as const;
export const DEFAULT_DEPOSIT_PERCENT = 30;
export const BALANCE_LEAD_MS = 48 * 60 * 60 * 1000;

export type MilestoneInput = { label: string; amount: number };

const round = (value: number) => Math.round(value * 100) / 100;

/** Splits an agreed fee into the deposit and balance portions (fee only, before platform and processing fees). */
export function splitDeposit(fee: number, depositPercent: number) {
  const deposit = round(fee * (depositPercent / 100));
  return { deposit, balance: round(fee - deposit) };
}

/** True when the milestone amounts add up to the agreed fee (to the cent). */
export function milestonesMatchFee(milestones: MilestoneInput[], fee: number) {
  return milestones.length > 0 && Math.abs(round(milestones.reduce((sum, m) => sum + m.amount, 0)) - round(fee)) < 0.005;
}

/**
 * What is charged at confirmation, and what remains:
 *  - full_sum: the whole fee now
 *  - deposit_balance: the deposit now, the balance ~48h before the event
 *  - milestone: nothing now; each milestone is charged on approval
 * Platform and processing fees are calculated per charge with
 * calculateMarketplaceFees, so a split booking pays the processor's fixed fee
 * once per charge.
 */
export function planPayment(params: { structure: PaymentStructure; fee: number; currency: string; depositPercent?: number; platformFeeRate?: number }) {
  const options = { currency: params.currency, platformFeeRate: params.platformFeeRate };
  if (params.structure === "deposit_balance") {
    const { deposit, balance } = splitDeposit(params.fee, params.depositPercent ?? DEFAULT_DEPOSIT_PERCENT);
    return { firstChargeFee: deposit, balanceFee: balance, first: calculateMarketplaceFees(deposit, options), balance: balance > 0 ? calculateMarketplaceFees(balance, options) : null };
  }
  if (params.structure === "milestone") return { firstChargeFee: 0, balanceFee: 0, first: null, balance: null };
  return { firstChargeFee: params.fee, balanceFee: 0, first: calculateMarketplaceFees(params.fee, options), balance: null };
}

export function balanceDueAt(eventStartsAt: Date) {
  return new Date(eventStartsAt.getTime() - BALANCE_LEAD_MS);
}

/** The fee portion collected by the booking's first charge. */
export function firstChargeFee(booking: { paymentStructure: PaymentStructure; fee: number; depositAmount: number }) {
  return booking.paymentStructure === "deposit_balance" ? booking.depositAmount : booking.fee;
}

/**
 * Checks the structure an applicant picked against what the listing offers.
 * Milestones are mandatory when the milestone structure is chosen, and must
 * add up to the agreed fee.
 */
export function validateApplicationPayment(
  offered: PaymentStructure[],
  input: { selectedPaymentStructure?: PaymentStructure; milestones?: MilestoneInput[] },
  fee: number
): { ok: true; structure: PaymentStructure; milestones: MilestoneInput[] | null } | { ok: false; message: string } {
  const allowed = offered.length ? offered : (["full_sum"] as PaymentStructure[]);
  const structure = input.selectedPaymentStructure ?? allowed[0];
  if (!allowed.includes(structure)) return { ok: false, message: "That payment structure isn't offered for this listing." };
  if (structure !== "milestone") return { ok: true, structure, milestones: null };
  if (!input.milestones?.length) return { ok: false, message: "Add your milestones: this listing pays by milestone." };
  if (!milestonesMatchFee(input.milestones, fee)) return { ok: false, message: "Milestone amounts must add up to your agreed fee." };
  return { ok: true, structure, milestones: input.milestones };
}
