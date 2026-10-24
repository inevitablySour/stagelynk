"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/marketplace-fees";

export interface MilestoneRow {
  id: string;
  label: string;
  amount: number;
  status: "pending" | "submitted" | "approved" | "paid";
}

export interface DealRow {
  id: string;
  dealType: "flat_fee" | "milestone" | "split_50_50";
  status: "proposed" | "accepted" | "declined" | "in_progress" | "completed" | "cancelled";
  title: string;
  description: string;
  rateBasis: string | null;
  rateAmount: number | null;
  currency: string;
  proposedBy: string;
  payerId: string | null;
  payeeId: string | null;
  milestones: MilestoneRow[];
}

function statusVariant(status: DealRow["status"]) {
  if (status === "completed" || status === "accepted") return "success" as const;
  if (status === "proposed" || status === "in_progress") return "warning" as const;
  return "destructive" as const;
}

export function DealCard({ deal, currentMusicianId }: { deal: DealRow; currentMusicianId: string }) {
  const [rows, setRows] = useState(deal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: string, milestoneId?: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/p2p/deals/${rows.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(milestoneId ? { milestoneId } : {}) }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "That action couldn't be completed.");
        return;
      }
      if (milestoneId) {
        setRows((prev) => ({ ...prev, milestones: prev.milestones.map((m) => (m.id === milestoneId ? json.data : m)) }));
      } else {
        setRows((prev) => ({ ...prev, ...json.data }));
      }
    } finally {
      setBusy(false);
    }
  };

  const canRespond = rows.status === "proposed" && rows.proposedBy !== currentMusicianId;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{rows.title}</CardTitle>
        <Badge variant={statusVariant(rows.status)}>{rows.status.replace("_", " ")}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.description && <p className="text-sm text-stone-600">{rows.description}</p>}

        {rows.dealType === "flat_fee" && (
          <p className="text-sm text-stone-900">
            {formatMoney(rows.rateAmount ?? 0, rows.currency)} / {rows.rateBasis}
          </p>
        )}

        {rows.dealType === "split_50_50" && <p className="text-sm text-stone-900">50/50 split — no platform fee, no cash changes hands here.</p>}

        {rows.dealType === "milestone" && (
          <div className="space-y-2">
            {rows.milestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-2 text-sm">
                <span>{m.label} — {formatMoney(m.amount, rows.currency)}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={m.status === "paid" ? "success" : m.status === "submitted" ? "warning" : "secondary"}>{m.status}</Badge>
                  {m.status === "pending" && rows.payeeId === currentMusicianId && (
                    <Button size="sm" variant="outline" onClick={() => act("submit-milestone", m.id)} disabled={busy}>
                      Submit
                    </Button>
                  )}
                  {m.status === "submitted" && rows.payerId === currentMusicianId && (
                    <Button size="sm" onClick={() => act("approve-milestone", m.id)} disabled={busy}>
                      Approve & pay
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {canRespond && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => act("decline")} disabled={busy}>
              Decline
            </Button>
            <Button size="sm" onClick={() => act("accept")} disabled={busy}>
              Accept
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
