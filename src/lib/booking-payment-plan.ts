import type { Booking, BookingMilestone } from "@prisma/client";

/** Serializable payment-structure details for the bookings dashboards. */
export type BookingPaymentPlan = {
  paymentStructure: "full_sum" | "deposit_balance" | "milestone";
  depositAmount: number;
  balanceDueAt: string | null;
  balanceChargedAt: string | null;
  balanceFailedAt: string | null;
  milestones: { id: string; label: string; amount: number; status: "pending" | "submitted" | "approved" | "paid" }[];
};

export function serializePaymentPlan(b: Pick<Booking, "paymentStructure" | "depositAmount" | "balanceDueAt" | "balanceChargedAt" | "balanceFailedAt"> & { milestones: BookingMilestone[] }): BookingPaymentPlan {
  return {
    paymentStructure: b.paymentStructure,
    depositAmount: b.depositAmount,
    balanceDueAt: b.balanceDueAt?.toISOString() ?? null,
    balanceChargedAt: b.balanceChargedAt?.toISOString() ?? null,
    balanceFailedAt: b.balanceFailedAt?.toISOString() ?? null,
    milestones: b.milestones.map((m) => ({ id: m.id, label: m.label, amount: m.amount, status: m.status })),
  };
}
