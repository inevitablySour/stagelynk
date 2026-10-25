"use client";

import { useEffect, useState } from "react";
import { CircleCheck, ExternalLink, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EQUIPMENT_GROUPS, WIKIDATA_SOFTWARE_CATEGORIES } from "@/lib/equipment-catalog/groups";
import { requestJson, selectClass, StatusBadge, type ItemStatus } from "@/components/admin/equipment/shared";

interface SearchResult {
  qid: string;
  label: string;
  description: string | null;
  catalogStatus: ItemStatus | null;
}

function WikidataImport({ onAdded }: { onAdded: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [category, setCategory] = useState<string>(WIKIDATA_SOFTWARE_CATEGORIES[0]);
  const [busyQid, setBusyQid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setSearching(true);
      requestJson<SearchResult[]>(`/api/admin/equipment/wikidata?q=${encodeURIComponent(q)}`)
        .then((r) => { if (!cancelled) { setResults(r); setError(null); } })
        .catch((e) => { if (!cancelled) setError((e as Error).message); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  async function importItem(result: SearchResult) {
    setBusyQid(result.qid);
    setError(null);
    try {
      await requestJson("/api/admin/equipment/wikidata", { method: "POST", body: JSON.stringify({ qid: result.qid, category }) });
      setResults((prev) => prev.map((r) => (r.qid === result.qid ? { ...r, catalogStatus: "active" } : r)));
      setAdded(result.label);
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyQid(null);
    }
  }

  return (
    <section className="panel-soft space-y-4 p-5">
      <div>
        <h3 className="font-semibold text-ink">Import software from Wikidata</h3>
        <p className="mt-1 text-sm text-muted">For products the sync misses, such as After Effects. Imported items go live immediately and are never retired by a sync.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setAdded(null); if (e.target.value.trim().length < 2) setResults([]); }} placeholder="Search, e.g. After Effects" className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
        </label>
        <select aria-label="Category for imported item" value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass()}>
          {WIKIDATA_SOFTWARE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {added && <p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><CircleCheck className="h-4 w-4" /> Added {added} to {category}.</p>}
      {searching && <p className="text-xs text-muted">Searching Wikidata…</p>}
      {results.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {results.map((r) => (
            <li key={r.qid} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <span className="truncate">{r.label}</span>
                  <a href={`https://www.wikidata.org/wiki/${r.qid}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-normal text-muted hover:text-brand">{r.qid} <ExternalLink className="inline h-3 w-3" /></a>
                </p>
                {r.description && <p className="truncate text-xs text-muted">{r.description}</p>}
              </div>
              {r.catalogStatus === "active" ? <StatusBadge status="active" /> : (
                <Button size="sm" variant="outline" onClick={() => importItem(r)} disabled={busyQid !== null}>
                  <Plus className="h-3.5 w-3.5" /> {r.catalogStatus ? "Add & activate" : "Add"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CustomItemForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState<string>("live-sound");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState<"hardware" | "software">("hardware");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestJson("/api/admin/equipment", { method: "POST", body: JSON.stringify({ name: name.trim(), group, category: category.trim(), kind }) });
      setAdded(name.trim());
      setName("");
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel-soft space-y-4 p-5">
      <div>
        <h3 className="font-semibold text-ink">Add a custom item</h3>
        <p className="mt-1 text-sm text-muted">For rider-specific gear neither source covers. Custom items are fully yours to edit and never touched by syncs.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium text-muted">Name<Input value={name} onChange={(e) => { setName(e.target.value); setAdded(null); }} placeholder="e.g. Hazer (water-based)" /></label>
        <label className="space-y-1 text-xs font-medium text-muted">Category<Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Stage effects" /></label>
        <label className="space-y-1 text-xs font-medium text-muted">
          Group
          <select value={group} onChange={(e) => { setGroup(e.target.value); setKind(e.target.value === "software" ? "software" : "hardware"); }} className={selectClass()}>
            {EQUIPMENT_GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-muted">
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value as "hardware" | "software")} className={selectClass()}>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
          </select>
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {added && <p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><CircleCheck className="h-4 w-4" /> Added {added}.</p>}
      <Button type="submit" disabled={busy || name.trim().length < 2 || category.trim().length < 2}><Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add item"}</Button>
    </form>
  );
}

export function AddItems({ onAdded }: { onAdded: () => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <WikidataImport onAdded={onAdded} />
      <CustomItemForm onAdded={onAdded} />
    </div>
  );
}
