"use client";

import { useState } from "react";
import { Calendar, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/marketplace-fees";
import { ApplicantPaymentField, emptyMilestones, type MilestoneDraft } from "@/components/payments/payment-structure-fields";
import type { PaymentStructure } from "@prisma/client";

interface ProjectRow {
  id: string;
  title: string;
  description: string;
  venueName: string;
  deadline: string | null;
  budgetMin: number;
  budgetMax: number;
  hideBudget: boolean;
  currency: string;
  genres: string[];
  applicantCount: number;
  offeredPaymentStructures: PaymentStructure[];
  depositPercent: number;
}

export function MusicianProjectsBrowser({ projects }: { projects: ProjectRow[] }) {
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [coverMessage, setCoverMessage] = useState("");
  const [proposedFee, setProposedFee] = useState("");
  const [structure, setStructure] = useState<PaymentStructure>("full_sum");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(emptyMilestones());
  const [busy, setBusy] = useState(false);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submit = async (id: string) => {
    if (structure === "milestone") {
      const parsed = milestones.map((m) => ({ label: m.label.trim(), amount: Number(m.amount) }));
      const sum = Math.round(parsed.reduce((total, m) => total + m.amount, 0) * 100) / 100;
      if (!proposedFee || parsed.some((m) => !m.label || !(m.amount > 0)) || Math.abs(sum - Number(proposedFee)) > 0.005) {
        setError("Enter your fee, name every milestone, and make the amounts add up to it.");
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/musicians/projects/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverMessage: coverMessage.trim() || undefined,
          proposedFee: proposedFee ? Number(proposedFee) : undefined,
          selectedPaymentStructure: structure,
          milestones: structure === "milestone" ? milestones.map((m) => ({ label: m.label.trim(), amount: Number(m.amount) })) : undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to submit application.");
        return;
      }
      setDoneIds((prev) => [...prev, id]);
      setApplyingId(null);
      setCoverMessage("");
      setProposedFee("");
    } finally {
      setBusy(false);
    }
  };

  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <p className="text-sm text-stone-500">No open projects right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((p) => (
        <Card key={p.id}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-stone-900">{p.title}</h3>
                <p className="mt-1 text-sm text-stone-500">{p.venueName}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-stone-600">{p.description}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
              {p.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Due {new Date(p.deadline).toLocaleDateString()}
                </span>
              )}
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {p.hideBudget ? "Discuss with client" : p.budgetMin > 0 || p.budgetMax > 0 ? `${formatMoney(p.budgetMin, p.currency)} – ${formatMoney(p.budgetMax, p.currency)}` : "Discuss with client"}
              </span>
            </div>
            {p.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.genres.map((g) => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </div>
            )}

            {doneIds.includes(p.id) ? (
              <p className="mt-4 text-sm font-medium text-brand">Application submitted.</p>
            ) : applyingId === p.id ? (
              <div className="mt-4 space-y-2">
                <textarea
                  className="min-h-20 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
                  placeholder="Cover message (optional)"
                  value={coverMessage}
                  onChange={(e) => setCoverMessage(e.target.value)}
                />
                <Input type="number" placeholder="Your proposed fee (optional)" value={proposedFee} onChange={(e) => setProposedFee(e.target.value)} />
                <ApplicantPaymentField offered={p.offeredPaymentStructures} selected={structure} onSelect={setStructure} fee={Number(proposedFee) || 0} milestones={milestones} onMilestones={setMilestones} depositPercent={p.depositPercent} />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setApplyingId(null)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => submit(p.id)} disabled={busy}>
                    {busy ? "Submitting…" : "Submit application"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" className="mt-4" onClick={() => { setApplyingId(p.id); setStructure(p.offeredPaymentStructures[0] ?? "full_sum"); setMilestones(emptyMilestones()); }}>
                Apply
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
