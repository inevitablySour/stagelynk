"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OpenCallEditor } from "@/components/dashboard/open-call-editor";
import { TechnicalGapAlert } from "@/components/equipment/technical-gap-alert";
import { calculateMarketplaceFees, formatMoney } from "@/lib/marketplace-fees";
import { PAYMENT_STRUCTURE_LABELS, planPayment } from "@/lib/payment-structures";
import type { PaymentStructure } from "@prisma/client";
import { getStripeClient } from "@/lib/stripe-client";
import type { OpenCallRow } from "@/lib/open-calls";
import type { ApplicationFitScore } from "@/lib/application-fit";
import type { TechnicalGap } from "@/types";

interface Applicant {
  id: string; status: string; coverMessage: string; agreedFee: number;
  availabilityConfirmed: boolean; availabilityNotes: string | null;
  musician: { id: string; stageName: string; location: string };
  slot: { id: string; label: string } | null; fit: ApplicationFitScore; technicalGaps: TechnicalGap[];
  booking: { paymentStatus: string; status: string } | null;
  selectedPaymentStructure?: PaymentStructure;
  proposedMilestones?: { label: string; amount: number }[] | null;
}

/** What the venue is charged right now, given the structure the artist picked. */
function chargeNow(app: Applicant, call: OpenCallRow) {
  const structure = app.selectedPaymentStructure ?? "full_sum";
  const plan = planPayment({ structure, fee: app.agreedFee, currency: call.currency, depositPercent: call.depositPercent });
  return { structure, plan, fees: plan.first ?? calculateMarketplaceFees(0, { currency: call.currency, passProcessorFeeToVenue: false }) };
}
interface Review { app: Applicant; call: OpenCallRow; card: { id: string; brand: string; last4: string } | null }

export function OpenCallsManager({ listings }: { listings: OpenCallRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<OpenCallRow | "new" | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  async function loadApplicants(id: string) {
    setExpanded(id); setError(""); setApplicants([]); setBusy(true);
    try {
      const response = await fetch(`/api/venues/jobs/${id}/applications`);
      const json = await response.json();
      if (!json.success) throw new Error(json.message || "Unable to load applicants.");
      setApplicants(json.data);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function changeStatus(call: OpenCallRow, status: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/venues/jobs/${call.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || "Unable to update the call.");
      router.refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function reviewPayment(app: Applicant, call: OpenCallRow) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/venues/me/payment-methods");
      const json = await response.json();
      if (!json.success) throw new Error(json.message || "Unable to load your payment method.");
      const card = json.data.paymentMethods.find((item: { id: string }) => item.id === json.data.defaultPaymentMethodId) ?? null;
      setReview({ app, call, card });
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function decide(app: Applicant, call: OpenCallRow, decision: "accept" | "decline" | "shortlist" | "cancel-payment", cardId?: string) {
    setBusy(true); setError("");
    try {
      const send = () => fetch(`/api/venues/applications/${app.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, expectedFee: app.agreedFee, expectedTotal: chargeNow(app, call).fees.totalChargeAmount, paymentReviewed: decision === "accept", expectedPaymentMethodId: cardId }),
      }).then((response) => response.json());
      let json = await send();
      if (json.requiresAction && json.clientSecret) {
        const stripe = await getStripeClient();
        if (!stripe) throw new Error("Card authentication is unavailable. Please retry.");
        const result = await stripe.confirmCardPayment(json.clientSecret);
        if (result.error) throw new Error(result.error.message || "Card authentication failed. Retry or cancel the pending payment.");
        json = await send();
      }
      if (!json.success) throw new Error(json.message || "Unable to complete this decision.");
      setReview(null);
      await loadApplicants(call.id);
      router.refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow mb-2">Find the right creative fit</p><h1 className="text-3xl font-bold tracking-tight">Open calls & lineup</h1><p className="mt-2 text-sm text-muted">Build a complete brief, compare applicants, and confirm only after payment succeeds.</p></div><Button onClick={() => { setEditing("new"); setReview(null); }}>Create open call</Button></div>
    {editing && <OpenCallEditor key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? undefined : editing} copy={editing !== "new" && editing.applicantCount > 0} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}
    {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {review && <Card className="mb-6 border-brand/40"><CardHeader><CardTitle>Review & confirm booking</CardTitle><p className="text-sm text-muted">{review.app.musician.stageName} · {review.call.title} · {review.app.slot?.label}</p></CardHeader><CardContent className="space-y-4">
      <dl className="space-y-2 text-sm">{(() => { const { structure, plan, fees } = chargeNow(review.app, review.call); return <><div className="flex justify-between gap-4"><dt>Payment structure</dt><dd>{PAYMENT_STRUCTURE_LABELS[structure]}</dd></div>{structure === "deposit_balance" && <div className="flex justify-between gap-4 text-muted"><dt>Balance, charged ~48h before the event</dt><dd>{formatMoney(plan.balanceFee, fees.currency)} + fees</dd></div>}{structure === "milestone" && <div className="text-muted">Nothing is charged now. Each of the {review.app.proposedMilestones?.length ?? 0} milestones is charged when you approve it.</div>}<div className="flex justify-between gap-4"><dt>Artist receives</dt><dd>{formatMoney(fees.performanceFee, fees.currency)}</dd></div><div className="flex justify-between gap-4"><dt>Platform fee (5%)</dt><dd>{formatMoney(fees.platformFeeAmount, fees.currency)}</dd></div><div className="flex justify-between gap-4"><dt>Processing estimate</dt><dd>{formatMoney(fees.processorFeeEstimate, fees.currency)}</dd></div><div className="flex justify-between gap-4 border-t border-line pt-3 font-semibold"><dt>Total charged now</dt><dd>{formatMoney(fees.totalChargeAmount, fees.currency)}</dd></div></>; })()}</dl>
      <p className="text-sm text-muted">{review.card ? `Default card: ${review.card.brand} ending ${review.card.last4}.` : "Add and select a default card before confirming."} <Link href="/venue/payment-methods" className="font-semibold text-brand underline">Payment methods</Link></p>
      <p className="text-xs leading-6 text-muted">Your saved card is charged now. The artist&apos;s payment stays on the platform until payout eligibility. The slot becomes booked only after successful payment. An unfinished payment reserves the slot for up to 30 minutes, bounded by the application deadline and event start.</p>
      <div className="flex flex-wrap gap-3"><Button disabled={busy || !review.card} onClick={() => decide(review.app, review.call, "accept", review.card?.id)}>{busy ? "Processing…" : "Pay & confirm booking"}</Button><Button variant="outline" disabled={busy} onClick={() => setReview(null)}>Back</Button></div>
    </CardContent></Card>}
    <div className="space-y-5">
      {listings.length === 0 && <div className="empty-state"><h2 className="text-lg font-semibold">Make room for your next lineup</h2><p className="mt-2 text-sm text-muted">Create an open call to receive applications from local creatives.</p></div>}
      {listings.map((call) => <Card key={call.id} className="rounded-2xl"><CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-xl font-semibold">{call.title}</h2><Badge variant={call.status === "published" ? "success" : "secondary"}>{call.status}</Badge></div><p className="mt-2 text-sm text-muted">{call.eventDate || "Date not set"} · {call.startTime || "—"}–{call.endTime || "—"} · {call.timeZone}</p><p className="mt-1 text-sm text-muted">{call.externalVenueName || call.venueName} · {call.location || "Location not set"}</p><p className="mt-2 text-sm font-semibold text-brand">{formatMoney(call.budgetMin, call.currency)}–{formatMoney(call.budgetMax, call.currency)} · {call.applicantCount} applications</p></div><div className="flex flex-wrap gap-2">{call.applicantCount === 0 && <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(call)}>Edit brief</Button>}{call.status === "draft" && <Button size="sm" disabled={busy} onClick={() => changeStatus(call, "published")}>Publish</Button>}{call.status === "published" && <Button size="sm" variant="outline" disabled={busy} onClick={() => changeStatus(call, "paused")}>Pause</Button>}{call.status === "paused" && <Button size="sm" variant="outline" disabled={busy} onClick={() => changeStatus(call, "published")}>Resume</Button>}{["published", "paused"].includes(call.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => changeStatus(call, "closed")}>Close</Button>}<Button size="sm" variant="outline" disabled={busy} onClick={() => expanded === call.id ? setExpanded(null) : loadApplicants(call.id)}>Applicants</Button></div></div>
        {call.applicantCount > 0 && <div className="mt-4 flex flex-wrap items-center gap-3"><Button size="sm" variant="outline" onClick={() => setEditing(call)}>Copy brief to new call</Button><p className="text-xs text-muted">Keep existing applications intact. Updated briefs require a new call and fresh availability confirmation.</p></div>}
        <div className="mt-4 flex flex-wrap gap-2">{call.slots.map((slot) => <Badge key={slot.id} variant={slot.filled ? "success" : "outline"}>{slot.label} · {slot.filled ? "booked" : slot.reserved ? "payment pending" : "open"}</Badge>)}</div>
        {expanded === call.id && <div className="mt-6 space-y-4 border-t border-line pt-5"><p className="text-xs text-muted">Sorted by genre, technical and financial fit; equal scores rotate daily.</p>{busy && <p role="status" className="text-sm text-muted">Loading / processing…</p>}{!busy && applicants.length === 0 && <p className="text-sm text-muted">No applicants yet.</p>}{applicants.map((app) => <article key={app.id} className="space-y-4 rounded-xl border border-line p-4"><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/artists/${app.musician.id}`} className="font-semibold text-brand hover:underline">{app.musician.stageName}</Link><Badge variant="secondary">{app.status} · {app.slot?.label || "No slot"}</Badge></div><div className="grid gap-2 text-xs sm:grid-cols-4">{([["Overall", app.fit.overall], ["Genre", app.fit.genreFit], ["Technical", app.fit.technicalFit], ["Financial", app.fit.financialFit]] as const).map(([label, score]) => <div key={label} className="rounded-lg bg-brand-soft/50 p-3">{label}<strong className="mt-1 block text-base text-brand">{Math.round(score * 100)}%</strong></div>)}</div><p className="text-sm font-medium">Agreed artist fee: {formatMoney(app.agreedFee, call.currency)}</p><p className="text-xs text-muted">{app.availabilityConfirmed ? "Artist confirmed availability for this slot." : "Availability not confirmed — cannot book yet."}</p>{app.availabilityNotes && <p className="text-sm text-muted">{app.availabilityNotes}</p>}{app.coverMessage && <p className="whitespace-pre-line text-sm leading-6 text-muted">{app.coverMessage}</p>}<TechnicalGapAlert gaps={app.technicalGaps} />{["submitted", "shortlisted"].includes(app.status) && <div className="flex flex-wrap gap-2">{app.booking?.status === "pending" ? <><Button size="sm" disabled={busy} onClick={() => reviewPayment(app, call)}>Resume payment</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => decide(app, call, "cancel-payment")}>Cancel payment attempt</Button></> : <><Button size="sm" disabled={busy || !app.availabilityConfirmed} onClick={() => reviewPayment(app, call)}>Review booking</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => decide(app, call, "shortlist")}>Shortlist</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => decide(app, call, "decline")}>Decline</Button></>}</div>}</article>)}</div>}
      </CardContent></Card>)}
    </div>
  </>;
}
