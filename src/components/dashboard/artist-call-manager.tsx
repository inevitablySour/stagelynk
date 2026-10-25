"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Megaphone, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_GROUPS, GENRE_GROUPS } from "@/config";
import { DEAL_TYPE_LABELS } from "@/lib/artist-call-options";
import type { ArtistCallRow } from "@/lib/artist-calls";

const selectClass = "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
const DEAL_TYPES = Object.entries(DEAL_TYPE_LABELS) as [keyof typeof DEAL_TYPE_LABELS, string][];
const DEAL_DETAIL_HINT: Record<string, string> = { rate: "e.g. €150 per day", milestone: "e.g. €300 in 3 milestones", split_credit: "e.g. 50/50 on streaming revenue, full credit" };

export interface CallApplicant { id: string; musicianId: string; stageName: string; conversationId: string | null }

export function ArtistCallManager({ calls, applicants = {} }: { calls: ArtistCallRow[]; applicants?: Record<string, CallApplicant[]> }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [genreSlug, setGenreSlug] = useState("");
  const [timeline, setTimeline] = useState("");
  const [dealType, setDealType] = useState<keyof typeof DEAL_TYPE_LABELS>("rate");
  const [dealDetails, setDealDetails] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(null); setPosted(false);
    try {
      const res = await fetch("/api/artist-calls", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, roleSlug, genreSlug: genreSlug || undefined, timeline, dealType, dealDetails, description }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.message ?? "Couldn't post your open call."); return; }
      setTitle(""); setRoleSlug(""); setGenreSlug(""); setTimeline(""); setDealDetails(""); setDescription(""); setDealType("rate");
      setPosted(true);
      router.refresh();
    } catch { setError("Couldn't post your open call right now."); } finally { setSaving(false); }
  }

  async function setStatus(id: string, status: "published" | "closed") {
    await fetch(`/api/artist-calls/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    router.refresh();
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this open call? Existing chats with applicants stay in your messages.")) return;
    await fetch(`/api/artist-calls/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-start gap-3 text-lg leading-snug">
            <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            Working on an ongoing project? Need help for an upcoming event, gig or live shoot? Post an open call here to let artists and freelancers know about your request.
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-5">
            <div>
              <label htmlFor="call-title" className="mb-1.5 block text-sm font-medium">Job title</label>
              <Input id="call-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="e.g. Looking for Cellist for 3-Track Ambient EP" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="call-role" className="mb-1.5 block text-sm font-medium">Role tag</label>
                <select id="call-role" value={roleSlug} onChange={(e) => setRoleSlug(e.target.value)} required className={selectClass}>
                  <option value="">Select a role…</option>
                  {CATEGORY_GROUPS.map((g) => (
                    <optgroup key={g.slug} label={g.name}>{g.subcategories.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="call-genre" className="mb-1.5 block text-sm font-medium">Genre <span className="font-normal text-muted">(optional)</span></label>
                <select id="call-genre" value={genreSlug} onChange={(e) => setGenreSlug(e.target.value)} className={selectClass}>
                  <option value="">Any genre</option>
                  {GENRE_GROUPS.map((g) => (
                    <optgroup key={g.slug} label={g.name}>{g.subgenres.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</optgroup>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="call-timeline" className="mb-1.5 block text-sm font-medium">Dates / timeline</label>
              <Input id="call-timeline" value={timeline} onChange={(e) => setTimeline(e.target.value)} maxLength={160} required placeholder="e.g. Recording late November" />
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Deal type</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {DEAL_TYPES.map(([value, label], index) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${dealType === value ? "border-brand bg-brand-soft/60 font-medium" : "border-line hover:border-line-strong"}`}>
                    <input type="radio" name="dealType" value={value} checked={dealType === value} onChange={() => setDealType(value)} className="accent-[var(--color-brand)]" />
                    <span><span className="text-muted">Option {index + 1}: </span>{label}</span>
                  </label>
                ))}
              </div>
              <Input className="mt-2" value={dealDetails} onChange={(e) => setDealDetails(e.target.value)} maxLength={160} aria-label="Deal details (optional)" placeholder={`${DEAL_DETAIL_HINT[dealType]} (optional)`} />
            </fieldset>
            <div>
              <label htmlFor="call-desc" className="mb-1.5 block text-sm font-medium">Short description / context</label>
              <textarea id="call-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1500} required rows={4}
                placeholder="2–3 sentences about the vibe and references."
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
            </div>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {posted && <p role="status" className="text-sm text-emerald-700">Your open call is live on the Open Calls page.</p>}
            <div><Button type="submit" disabled={saving}>{saving ? "Posting…" : "Post open call"}</Button></div>
          </form>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Your open calls</h2>
        {calls.length === 0 ? (
          <div className="empty-state"><p className="text-sm text-muted">You haven&apos;t posted any open calls yet.</p></div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <Card key={call.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{call.title}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={call.status === "published" ? "success" : "secondary"}>{call.status === "published" ? "Open" : "Closed"}</Badge>
                      <Badge variant="secondary">{call.roleName}</Badge>
                      <Badge variant="outline">{call.dealLabel}</Badge>
                      <Badge variant="outline">{call.applicantCount} {call.applicantCount === 1 ? "applicant" : "applicants"}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setStatus(call.id, call.status === "published" ? "closed" : "published")}>{call.status === "published" ? "Close" : "Reopen"}</Button>
                    <Button variant="outline" size="sm" onClick={() => remove(call.id)} aria-label={`Delete ${call.title}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {(applicants[call.id] ?? []).length > 0 && (
                    <ul className="basis-full space-y-1.5 border-t border-line pt-3">
                      {applicants[call.id].map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                          <Link href={`/artists/${a.musicianId}`} className="font-medium text-brand hover:underline">{a.stageName}</Link>
                          {a.conversationId && <Link href={`/musician/p2p/messages?c=${a.conversationId}`} className="text-muted hover:text-ink hover:underline">Open chat</Link>}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
