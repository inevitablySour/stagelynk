"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, MapPin, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CATEGORY_GROUPS, GENRE_GROUPS } from "@/config";
import type { ArtistCallRow } from "@/lib/artist-calls";

const selectClass = "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

export function ArtistCallsBoard({ initial, appliedIds }: { initial: ArtistCallRow[]; appliedIds: string[] }) {
  const router = useRouter();
  const [calls, setCalls] = useState(initial);
  const [applied, setApplied] = useState<string[]>(appliedIds);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [genre, setGenre] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      if (genre) params.set("genre", genre);
      try {
        const json = await (await fetch(`/api/artist-calls?${params}`, { signal: controller.signal })).json();
        if (json.success) setCalls(json.data);
      } catch { /* aborted or offline: keep the previous results */ }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, role, genre]);

  async function apply(id: string) {
    setBusyId(id); setError(null);
    try {
      const json = await (await fetch(`/api/artist-calls/${id}/apply`, { method: "POST" })).json();
      if (!json.success) { setError(json.message ?? "Couldn't apply."); return; }
      setApplied((prev) => [...prev, id]);
      router.push(`/musician/p2p/messages?c=${json.data.conversationId}`);
    } catch { setError("Couldn't apply right now."); } finally { setBusyId(null); }
  }

  return (
    <div>
      <div className="mb-5 grid gap-4 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-3">
        <div><label htmlFor="ac-q" className="mb-2 block text-xs font-medium text-muted">Search</label><Input id="ac-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, timeline, vibe" /></div>
        <div>
          <label htmlFor="ac-role" className="mb-2 block text-xs font-medium text-muted">Category / role</label>
          <select id="ac-role" value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
            <option value="">All roles</option>
            {CATEGORY_GROUPS.map((g) => <optgroup key={g.slug} label={g.name}>{g.subcategories.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</optgroup>)}
          </select>
        </div>
        <div>
          <label htmlFor="ac-genre" className="mb-2 block text-xs font-medium text-muted">Genre</label>
          <select id="ac-genre" value={genre} onChange={(e) => setGenre(e.target.value)} className={selectClass}>
            <option value="">All genres</option>
            {GENRE_GROUPS.map((g) => <optgroup key={g.slug} label={g.name}>{g.subgenres.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</optgroup>)}
          </select>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {calls.length === 0 ? (
        <div className="empty-state"><p className="text-sm text-muted">No artist open calls match right now.</p></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {calls.map((call) => (
            <Card key={call.id}>
              <CardContent className="flex h-full flex-col p-5">
                <p className="eyebrow mb-2">Artist call</p>
                <h3 className="text-lg font-semibold leading-snug text-ink">{call.title}</h3>
                <p className="mt-1 text-sm text-muted">
                  Posted by <Link href={`/artists/${call.poster.id}`} className="font-medium text-brand hover:underline">{call.poster.stageName}</Link>
                  {call.poster.location && <span className="ml-2 inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{call.poster.location}</span>}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{call.roleName}</Badge>
                  {call.genreName && <Badge variant="secondary">{call.genreName}</Badge>}
                  <Badge variant="outline">{call.dealLabel}</Badge>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-ink"><CalendarClock className="h-4 w-4 text-brand" />{call.timeline}</p>
                {call.dealDetails && <p className="mt-1 text-sm text-muted">{call.dealDetails}</p>}
                <p className="mt-3 flex-1 text-sm leading-6 text-muted">{call.description}</p>
                <div className="mt-4">
                  {applied.includes(call.id) ? (
                    <Button variant="outline" size="sm" asChild><Link href="/musician/p2p/messages"><MessageCircle className="mr-1.5 h-4 w-4" />Applied · open chat</Link></Button>
                  ) : (
                    <Button size="sm" onClick={() => apply(call.id)} disabled={busyId === call.id}>{busyId === call.id ? "Sending…" : "Apply with Profile"}</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
