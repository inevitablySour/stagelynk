"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DealRow } from "@/components/p2p/deal-card";

type DealType = "flat_fee" | "milestone" | "split_50_50";

export function ProposeDealForm({
  matchId,
  otherMusicianId,
  onProposed,
}: {
  matchId: string;
  otherMusicianId: string;
  onProposed: (deal: DealRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dealType, setDealType] = useState<DealType>("flat_fee");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [payeeIsOther, setPayeeIsOther] = useState(true);
  const [rateBasis, setRateBasis] = useState<"hourly" | "daily">("hourly");
  const [rateAmount, setRateAmount] = useState("");
  const [milestones, setMilestones] = useState([{ label: "", amount: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMilestone = () => setMilestones((prev) => [...prev, { label: "", amount: "" }]);
  const removeMilestone = (index: number) => setMilestones((prev) => prev.filter((_, i) => i !== index));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payeeId = payeeIsOther ? otherMusicianId : undefined;
      const body =
        dealType === "flat_fee"
          ? { matchId, dealType, title, description, payeeId, rateBasis, rateAmount: Number(rateAmount) }
          : dealType === "milestone"
            ? {
                matchId,
                dealType,
                title,
                description,
                payeeId,
                milestones: milestones
                  .filter((m) => m.label.trim() && m.amount)
                  .map((m) => ({ label: m.label.trim(), amount: Number(m.amount) })),
              }
            : { matchId, dealType, title, description };

      const res = await fetch("/api/p2p/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to propose that deal.");
        return;
      }
      onProposed(json.data);
      setOpen(false);
      setTitle("");
      setDescription("");
      setRateAmount("");
      setMilestones([{ label: "", amount: "" }]);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Propose a deal
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Propose a deal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["flat_fee", "Hourly / daily flat fee"],
              ["milestone", "Milestone / deliverable"],
              ["split_50_50", "50/50 split (no cash)"],
            ] as const
          ).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setDealType(value)}>
              <Badge variant={dealType === value ? "default" : "outline"}>{label}</Badge>
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Co-write a track" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Description</label>
          <textarea
            className="min-h-20 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {dealType !== "split_50_50" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">Who gets paid?</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPayeeIsOther(true)}>
                <Badge variant={payeeIsOther ? "default" : "outline"}>They do (I&apos;m paying)</Badge>
              </button>
              <button type="button" onClick={() => setPayeeIsOther(false)}>
                <Badge variant={!payeeIsOther ? "default" : "outline"}>I do (they&apos;re paying)</Badge>
              </button>
            </div>
          </div>
        )}

        {dealType === "flat_fee" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Rate basis</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRateBasis("hourly")}>
                  <Badge variant={rateBasis === "hourly" ? "default" : "outline"}>Hourly</Badge>
                </button>
                <button type="button" onClick={() => setRateBasis("daily")}>
                  <Badge variant={rateBasis === "daily" ? "default" : "outline"}>Daily</Badge>
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Amount (EUR)</label>
              <Input type="number" min={0} value={rateAmount} onChange={(e) => setRateAmount(e.target.value)} />
            </div>
          </div>
        )}

        {dealType === "milestone" && (
          <div className="space-y-2">
            <label className="mb-1.5 block text-sm font-medium">Milestones</label>
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Deliverable"
                  value={m.label}
                  onChange={(e) =>
                    setMilestones((prev) => prev.map((row, idx) => (idx === i ? { ...row, label: e.target.value } : row)))
                  }
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="EUR"
                  className="max-w-[120px]"
                  value={m.amount}
                  onChange={(e) =>
                    setMilestones((prev) => prev.map((row, idx) => (idx === i ? { ...row, amount: e.target.value } : row)))
                  }
                />
                {milestones.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeMilestone(i)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
              Add milestone
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={saving || !title.trim()}>
            {saving ? "Sending…" : "Send proposal"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
