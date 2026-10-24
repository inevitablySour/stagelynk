"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/marketplace-fees";

interface AdminDispute {
  id: string;
  kind: string;
  timing: string;
  status: string;
  initiatedBy: "musician" | "venue";
  reason: string;
  requestedRefundAmount: number | null;
  createdAt: string;
  booking: {
    id: string;
    title: string;
    eventDate: string;
    totalChargeAmount: number;
    currency: string;
    musician: { stageName: string };
    venue: { venueName: string };
  };
}

export function AdminDisputesManager() {
  const [disputes, setDisputes] = useState<AdminDispute[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [refundById, setRefundById] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/disputes")
      .then((res) => res.json())
      .then((json) => setDisputes(json.success ? json.data : []));
  }, []);

  const resolve = async (dispute: AdminDispute, resolution: "resolved_refund_full" | "resolved_refund_partial" | "resolved_no_refund") => {
    const resolutionNotes = (notesById[dispute.id] ?? "").trim();
    if (resolutionNotes.length < 5) {
      setError("Add resolution notes (5+ characters) before resolving.");
      return;
    }
    const refundAmount = resolution === "resolved_refund_partial" ? Number(refundById[dispute.id] ?? 0) : undefined;
    if (resolution === "resolved_refund_partial" && (!refundAmount || refundAmount <= 0)) {
      setError("Enter a valid partial refund amount.");
      return;
    }
    setBusyId(dispute.id);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${dispute.booking.id}/disputes/${dispute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", resolution, refundAmount, resolutionNotes }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to resolve dispute.");
        return;
      }
      setDisputes((prev) => (prev ?? []).filter((d) => d.id !== dispute.id));
    } finally {
      setBusyId(null);
    }
  };

  if (disputes === null) return <p className="text-sm text-stone-500">Loading…</p>;
  if (disputes.length === 0) return <p className="text-sm text-stone-500 py-10 text-center">No open disputes.</p>;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {disputes.map((dispute) => (
        <Card key={dispute.id}>
          <CardContent className="p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-stone-900">{dispute.booking.title}</p>
                <p className="text-xs text-stone-500">
                  {dispute.booking.musician.stageName} · {dispute.booking.venue.venueName} · {new Date(dispute.booking.eventDate).toLocaleDateString()}
                </p>
              </div>
              <p className="text-sm font-medium text-stone-700">
                {formatMoney(dispute.booking.totalChargeAmount, dispute.booking.currency)}
              </p>
            </div>
            <p className="text-sm text-stone-600">
              <span className="font-medium">{dispute.initiatedBy === "musician" ? dispute.booking.musician.stageName : dispute.booking.venue.venueName}</span>{" "}
              filed a {dispute.kind.replace(/_/g, " ")} dispute ({dispute.timing.replace(/_/g, " ")}), status: {dispute.status.replace(/_/g, " ")}
            </p>
            <p className="text-sm text-stone-700">{dispute.reason}</p>
            {dispute.requestedRefundAmount != null && (
              <p className="text-xs text-stone-500">Requested refund: {formatMoney(dispute.requestedRefundAmount, dispute.booking.currency)}</p>
            )}
            <textarea
              className="min-h-16 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
              placeholder="Resolution notes (sent to both parties)"
              value={notesById[dispute.id] ?? ""}
              onChange={(e) => setNotesById((prev) => ({ ...prev, [dispute.id]: e.target.value }))}
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                placeholder="Partial refund amount"
                className="w-40 rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm"
                value={refundById[dispute.id] ?? ""}
                onChange={(e) => setRefundById((prev) => ({ ...prev, [dispute.id]: e.target.value }))}
              />
              <Button size="sm" onClick={() => resolve(dispute, "resolved_refund_partial")} disabled={busyId === dispute.id}>
                Partial refund
              </Button>
              <Button size="sm" variant="outline" onClick={() => resolve(dispute, "resolved_refund_full")} disabled={busyId === dispute.id}>
                Full refund
              </Button>
              <Button size="sm" variant="ghost" onClick={() => resolve(dispute, "resolved_no_refund")} disabled={busyId === dispute.id}>
                No refund
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
