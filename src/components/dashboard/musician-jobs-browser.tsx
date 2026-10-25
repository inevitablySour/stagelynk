"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicJobListing } from "@/components/jobs/job-listings";
import { OpenCallFeed } from "@/components/jobs/open-call-feed";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApplicantPaymentField, emptyMilestones, type MilestoneDraft } from "@/components/payments/payment-structure-fields";
import type { PaymentStructure } from "@prisma/client";
import { ArtistCallsBoard } from "@/components/dashboard/artist-calls-board";
import type { ArtistCallRow } from "@/lib/artist-calls";

interface MusicianJobsBrowserProps {
  jobs: PublicJobListing[];
  appliedJobIds: string[];
  quotedFee?: number | null;
  artistCalls?: ArtistCallRow[];
  appliedArtistCallIds?: string[];
}

type Source = "venue" | "artist";

export function MusicianJobsBrowser({ jobs, appliedJobIds, quotedFee, artistCalls = [], appliedArtistCallIds = [] }: MusicianJobsBrowserProps) {
  const [source, setSource] = useState<Source>("venue");
  const router = useRouter();
  const [applyTarget, setApplyTarget] = useState<string | null>(null);
  const [coverMessage, setCoverMessage] = useState("");
  const [proposedFee, setProposedFee] = useState("");
  const [slotId, setSlotId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<string[]>(appliedJobIds);
  const [selectedJob, setSelectedJob] = useState<PublicJobListing | null>(null);
  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(false);
  const [structure, setStructure] = useState<PaymentStructure>("full_sum");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(emptyMilestones());

  const targetJob = selectedJob ?? jobs.find((j) => j.id === applyTarget);
  const openSlots = targetJob?.slots?.filter((s) => !s.filled && !s.reserved) ?? [];

  const handleSubmit = async () => {
    if (!applyTarget) return;
    if (!proposedFee || !Number.isFinite(Number(proposedFee)) || Number(proposedFee) <= 0) {
      setError("Review and enter a positive artist fee before applying.");
      return;
    }
    if (!availabilityConfirmed || openSlots.length === 0) {
      setError("Confirm your availability and select an open slot.");
      return;
    }
    if (openSlots.length > 0 && !slotId) {
      setError("Please choose which slot you're applying for.");
      return;
    }
    if (structure === "milestone") {
      const parsedMilestones = milestones.map((m) => ({ label: m.label.trim(), amount: Number(m.amount) }));
      const sum = Math.round(parsedMilestones.reduce((total, m) => total + m.amount, 0) * 100) / 100;
      if (parsedMilestones.some((m) => !m.label || !(m.amount > 0)) || Math.abs(sum - Number(proposedFee)) > 0.005) {
        setError("Name every milestone and make the amounts add up to your fee.");
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/musicians/jobs/${applyTarget}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverMessage: coverMessage.trim(),
          proposedFee: proposedFee ? Number(proposedFee) : undefined,
          slotId: slotId || undefined,
          availabilityConfirmed,
          selectedPaymentStructure: structure,
          milestones: structure === "milestone" ? milestones.map((m) => ({ label: m.label.trim(), amount: Number(m.amount) })) : undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to submit application.");
        return;
      }
      setApplied((prev) => [...prev, applyTarget]);
      setApplyTarget(null);
      setCoverMessage("");
      setProposedFee("");
      setSlotId("");
      router.refresh();
    } catch {
      setError("Unable to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: [Source, string][] = [["venue", "Venue & client calls"], ["artist", "Artist calls"]];

  return (
    <>
      <div role="tablist" aria-label="Open call source" className="mb-5 inline-flex rounded-xl border border-line bg-surface p-1">
        {tabs.map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={source === value} onClick={() => setSource(value)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${source === value ? "bg-brand text-surface" : "text-muted hover:text-ink"}`}>
            {label}{value === "artist" && artistCalls.length > 0 ? ` (${artistCalls.length})` : ""}
          </button>
        ))}
      </div>
      {source === "artist" && <ArtistCallsBoard initial={artistCalls} appliedIds={appliedArtistCallIds} />}
      {source === "venue" && <>
      {applyTarget && (
        <Card className="mb-6 border-olive-200">
          <CardContent className="p-5 space-y-3">
            <p className="text-lg font-semibold text-ink">Apply to {targetJob?.title}</p>
            <p className="text-sm leading-6 text-muted">Your current portfolio and technical rider are linked automatically. A cover message is optional.</p>
            {openSlots.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Which slot?</label>
                <select
                  value={slotId}
                  onChange={(e) => {
                    setSlotId(e.target.value);
                    const slot = openSlots.find((item) => item.id === e.target.value);
                    setProposedFee(String(quotedFee ?? slot?.budgetMin ?? targetJob?.budgetMin ?? ""));
                  }}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm"
                >
                  <option value="">Select a slot...</option>
                  {openSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Your agreed artist fee (EUR)</label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                aria-label="Proposed artist fee in EUR"
                placeholder="e.g. 300"
                value={proposedFee}
                onChange={(e) => setProposedFee(e.target.value)}
              />
            </div>
            <ApplicantPaymentField
              offered={targetJob?.offeredPaymentStructures ?? ["full_sum"]} selected={structure} onSelect={setStructure}
              fee={Number(proposedFee) || 0} milestones={milestones} onMilestones={setMilestones} depositPercent={targetJob?.depositPercent ?? 30}
            />
            <textarea
              className="min-h-24 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
              aria-label="Optional cover message"
              placeholder="Anything you'd like the client to know? (optional)"
              value={coverMessage}
              onChange={(e) => setCoverMessage(e.target.value)}
            />
            <label className="flex items-start gap-3 text-sm leading-6 text-muted"><input type="checkbox" className="mt-1" checked={availabilityConfirmed} onChange={(event) => setAvailabilityConfirmed(event.target.checked)} />I am available for this event and have reviewed the date, time, stage specifications and fee. The fee shown above is what the client will review.</label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit application"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setApplyTarget(null); setError(null); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <OpenCallFeed
        initial={jobs}
        canMatch
        excludedIds={applied}
        ctaLabel="Apply Now"
        onApply={(id, job) => {
          const call = job ?? jobs.find((entry) => entry.id === id);
          setSelectedJob(call ?? null); setApplyTarget(id); setError(""); setCoverMessage(""); setAvailabilityConfirmed(false);
          setStructure(call?.offeredPaymentStructures?.[0] ?? "full_sum"); setMilestones(emptyMilestones());
          const available = call?.slots?.filter((slot) => !slot.filled && !slot.reserved) ?? [];
          setSlotId(available.length === 1 ? available[0].id : "");
          setProposedFee(String(quotedFee ?? available[0]?.budgetMin ?? call?.budgetMin ?? ""));
          window.scrollTo({ top: 0, behavior: "instant" });
        }}
      />

      {applied.length > 0 && jobs.some((j) => applied.includes(j.id)) && (
        <p className="mt-6 text-xs text-stone-400 text-center">
          You&apos;ve applied to {jobs.filter((j) => applied.includes(j.id)).length} of the listings above.
        </p>
      )}
    </>}
    </>
  );
}
