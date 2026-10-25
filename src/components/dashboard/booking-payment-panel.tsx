"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CircleCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/marketplace-fees";
import type { BookingPaymentPlan } from "@/lib/booking-payment-plan";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Shows how a booking is being paid and, for milestone bookings, lets the artist submit and the client approve. */
export function BookingPaymentPanel({ bookingId, fee, currency, plan, viewerRole, active }: {
  bookingId: string; fee: number; currency: string; plan: BookingPaymentPlan; viewerRole: "musician" | "venue"; active: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (plan.paymentStructure === "full_sum") return null;

  async function act(milestoneId: string, action: "submit" | "approve") {
    setBusy(milestoneId); setError(null);
    try {
      const json = await (await fetch(`/api/bookings/${bookingId}/milestones/${milestoneId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      })).json();
      if (!json.success) { setError(json.message ?? "That didn't go through."); return; }
      router.refresh();
    } catch { setError("That didn't go through. Try again."); } finally { setBusy(null); }
  }

  return (
    <div className="mt-3 rounded-lg border border-line bg-surface-strong/40 p-3 text-sm" onClick={(e) => e.stopPropagation()}>
      {plan.paymentStructure === "deposit_balance" ? (
        <div className="space-y-1">
          <p className="font-medium text-ink">Deposit + balance</p>
          <p className="flex items-center gap-1.5 text-muted"><CircleCheck className="h-4 w-4 text-emerald-600" />Deposit {formatMoney(plan.depositAmount, currency)} paid</p>
          {plan.balanceChargedAt ? (
            <p className="flex items-center gap-1.5 text-muted"><CircleCheck className="h-4 w-4 text-emerald-600" />Balance {formatMoney(Math.round((fee - plan.depositAmount) * 100) / 100, currency)} paid {dateFormat.format(new Date(plan.balanceChargedAt))}</p>
          ) : plan.balanceFailedAt ? (
            <p className="flex items-center gap-1.5 text-amber-700"><TriangleAlert className="h-4 w-4" />Balance payment failed. We&apos;re retrying automatically{viewerRole === "venue" ? "; please check your saved card" : ""}.</p>
          ) : (
            <p className="flex items-center gap-1.5 text-muted"><CalendarClock className="h-4 w-4" />Balance {formatMoney(Math.round((fee - plan.depositAmount) * 100) / 100, currency)} is charged{plan.balanceDueAt ? ` around ${dateFormat.format(new Date(plan.balanceDueAt))}` : " about 48 hours before the event"}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="font-medium text-ink">Milestones</p>
          {plan.milestones.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>{m.label} <span className="text-muted">· {formatMoney(m.amount, currency)}</span></span>
              <span className="flex items-center gap-2">
                <Badge variant={m.status === "paid" ? "success" : m.status === "submitted" ? "warning" : "secondary"}>{m.status === "submitted" ? "awaiting approval" : m.status}</Badge>
                {active && viewerRole === "musician" && m.status === "pending" && <Button size="sm" variant="outline" disabled={busy === m.id} onClick={() => act(m.id, "submit")}>Submit</Button>}
                {active && viewerRole === "venue" && m.status === "submitted" && <Button size="sm" disabled={busy === m.id} onClick={() => act(m.id, "approve")}>{busy === m.id ? "Paying…" : "Approve & pay"}</Button>}
              </span>
            </div>
          ))}
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
