"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/marketplace-fees";
import type { PromotionsDashboardData } from "@/lib/promotions";

export function PromotionsManager({ initial }: { initial: PromotionsDashboardData }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function refresh() {
    const response = await fetch("/api/promotions", { cache: "no-store" });
    const json = await response.json();
    if (!json.success) throw new Error(json.message ?? "Unable to refresh promotions.");
    setData(json.data);
    router.refresh();
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/promotions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobListingId: form.get("jobListingId"), pricingOptionId: form.get("pricingOptionId") || undefined,
          budgetAmount: Number(form.get("budgetAmount")),
          startsAt: new Date(`${form.get("startsAt")}T00:00:00Z`).toISOString(),
          endsAt: new Date(`${form.get("endsAt")}T23:59:59Z`).toISOString(),
        }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message ?? "Unable to save draft.");
      await refresh();
      setShowForm(false);
      setMessage("Campaign draft saved. No payment was taken and no boost is active.");
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function cancel(id: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/promotions/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!json.success) throw new Error(json.message ?? "Unable to cancel this draft.");
      await refresh();
      setMessage("Draft cancelled.");
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  const totals = data.totals;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow mb-2">Your actual campaign performance</p><h1 className="text-3xl font-bold tracking-tight">Promotions</h1><p className="mt-2 text-sm leading-6 text-muted">Campaigns, recorded spend and engagement from your account. No sample metrics.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await refresh(); } catch { setError("Unable to refresh promotions."); } finally { setBusy(false); } }}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button disabled={busy || data.jobs.length === 0} onClick={() => setShowForm((value) => !value)}><Plus className="mr-2 h-4 w-4" />New campaign draft</Button></div>
    </div>
    <p className="rounded-xl border border-line bg-brand-soft/40 p-4 text-sm leading-6 text-muted">Paid campaign activation is not enabled yet. Drafts are saved to the database, but do not charge your card or promote a listing. Recorded spend remains unchanged until a payment is actually recorded.</p>
    {data.jobs.length === 0 && <p className="text-sm text-muted"><Link href="/venue/jobs" className="font-semibold text-brand underline">Publish an open call</Link> before creating a promotion draft.</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-brand/30 bg-brand-soft p-3 text-sm text-brand">{message}</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card><CardContent className="p-5"><p className="text-xs text-muted">Recorded spend</p><p className="mt-2 text-xl font-semibold">{totals.spend.length ? totals.spend.map((entry) => formatMoney(entry.amount, entry.currency)).join(" · ") : formatMoney(0)}</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="text-xs text-muted">Recorded impressions</p><p className="mt-2 text-2xl font-semibold">{totals.views.toLocaleString()}</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="text-xs text-muted">Recorded clicks</p><p className="mt-2 text-2xl font-semibold">{totals.clicks.toLocaleString()}</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="text-xs text-muted">Click-through rate</p><p className="mt-2 text-2xl font-semibold">{totals.clickRate.toFixed(1)}%</p></CardContent></Card>
    </div>
    {showForm && <Card><CardHeader><CardTitle>Create a campaign draft</CardTitle><CardDescription>Plan an open-call promotion. This is not checkout.</CardDescription></CardHeader><CardContent><form onSubmit={create} className="space-y-4">
      <div><label htmlFor="promotion-job" className="mb-2 block text-sm font-medium">Published open call</label><select id="promotion-job" name="jobListingId" required className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">{data.jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></div>
      <div><label htmlFor="promotion-package" className="mb-2 block text-sm font-medium">Package</label><select id="promotion-package" name="pricingOptionId" className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="">Custom draft budget (no package purchased)</option>{data.options.filter((option) => option.placement === "job_listing").map((option) => <option key={option.id} value={option.id}>{option.name} · {formatMoney(option.price, option.currency)}</option>)}</select></div>
      <div className="grid gap-4 sm:grid-cols-3"><div><label htmlFor="promotion-budget" className="mb-2 block text-sm font-medium">Planned budget (EUR)</label><Input id="promotion-budget" name="budgetAmount" type="number" required min="0.01" max={100000} step="0.01" placeholder="e.g. 25" /></div><div><label htmlFor="promotion-start" className="mb-2 block text-sm font-medium">Start date (UTC)</label><Input id="promotion-start" name="startsAt" type="date" required /></div><div><label htmlFor="promotion-end" className="mb-2 block text-sm font-medium">End date (UTC)</label><Input id="promotion-end" name="endsAt" type="date" required /></div></div>
      <div className="flex gap-3"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save draft"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setShowForm(false)}>Cancel</Button></div>
    </form></CardContent></Card>}
    <Card><CardHeader><CardTitle>Your campaigns</CardTitle><CardDescription>Data is refreshed from the database when this page loads or you select Refresh.</CardDescription></CardHeader><CardContent className="space-y-4">
      {data.campaigns.length === 0 && <div className="empty-state"><Megaphone className="mx-auto mb-3 h-8 w-8 text-brand" /><h2 className="font-semibold">No campaigns yet</h2><p className="mt-2 text-sm text-muted">Your actual campaigns and results will appear here. Nothing has been spent.</p></div>}
      {data.campaigns.map((campaign) => <article key={campaign.id} className="rounded-xl border border-line p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{campaign.name}</h2><Badge variant={campaign.status === "active" ? "success" : "secondary"}>{campaign.status}</Badge></div><p className="mt-2 text-xs text-muted">{campaign.placement.replaceAll("_", " ")} · {campaign.billingModel.replaceAll("_", " ")} · {campaign.views} impressions · {campaign.clicks} clicks</p><p className="mt-3 text-sm">Recorded spend: <strong>{formatMoney(campaign.spentAmount, campaign.currency)}</strong> · Planned budget: {formatMoney(campaign.budgetAmount, campaign.currency)}</p><p className="mt-2 text-xs text-muted">{campaign.startsAt.slice(0, 10)} → {campaign.endsAt?.slice(0, 10) ?? "No end date"} (UTC){campaign.viewLimit ? ` · Limit ${campaign.viewLimit} impressions` : ""}</p>{campaign.status === "draft" && <Button size="sm" variant="outline" className="mt-4" disabled={busy} onClick={() => cancel(campaign.id)}>Cancel draft</Button>}</article>)}
    </CardContent></Card>
    <section><h2 className="mb-4 text-xl font-semibold">Configured boost packages</h2>{data.options.length === 0 ? <p className="rounded-xl border border-line bg-surface p-5 text-sm text-muted">No active packages are configured in the database. No placeholder prices or purchases are shown.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.options.map((option) => <Card key={option.id}><CardHeader><CardTitle className="text-base">{option.name}</CardTitle><CardDescription>{option.description}</CardDescription></CardHeader><CardContent><p className="text-xl font-semibold text-brand">{formatMoney(option.price, option.currency)}</p><p className="mt-2 text-xs text-muted">{option.placement.replaceAll("_", " ")} · {option.billingModel.replaceAll("_", " ")}</p><p className="mt-3 text-xs text-muted">Catalog price only — purchasing is not yet available.</p></CardContent></Card>)}</div>}</section>
  </div>;
}
