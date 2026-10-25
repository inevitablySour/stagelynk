"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Inbox, Pencil, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ItemEditor, SourceBadge, requestJson, type AdminItem, type AdminListResponse } from "@/components/admin/equipment/shared";

export function ReviewQueue({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<AdminItem[] | null>(null);
  const [categories, setCategories] = useState<AdminListResponse["categories"]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    requestJson<AdminListResponse>("/api/admin/equipment?status=pending&pageSize=500")
      .then((data) => { if (!cancelled) { setItems(data.items); setCategories(data.categories); } })
      .catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((i) => !q || i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q));
  }, [items, query]);

  const sections = useMemo(() => {
    const map = new Map<string, AdminItem[]>();
    for (const item of filtered) map.set(item.category, [...(map.get(item.category) ?? []), item]);
    return [...map.entries()];
  }, [filtered]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleMany(ids: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((id) => next.has(id));
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function act(ids: string[], action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      await requestJson("/api/admin/equipment/bulk", { method: "POST", body: JSON.stringify({ ids, action }) });
      setItems((prev) => (prev ?? []).filter((i) => !ids.includes(i.id)));
      setSelected((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (items === null) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-strong" />)}</div>;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
        <Inbox className="mx-auto h-8 w-8 text-brand" />
        <p className="mt-3 font-semibold text-ink">The review queue is clear</p>
        <p className="mt-1 text-sm text-muted">New software from a Wikidata sync will appear here for approval.</p>
      </div>
    );
  }

  const selectedIds = [...selected];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Filter ${items.length} pending items`} className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
        </label>
        <p className="text-xs text-muted">Approved items appear in pickers immediately. Rejected items never come back on future syncs.</p>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {sections.map(([category, rows]) => {
        const ids = rows.map((r) => r.id);
        const allOn = ids.every((id) => selected.has(id));
        return (
          <section key={category} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-strong/60 px-4 py-2.5">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-ink">
                <input type="checkbox" checked={allOn} onChange={() => toggleMany(ids)} className="h-4 w-4 rounded border-line-strong accent-[var(--color-brand)]" />
                {category}
                <span className="font-normal text-muted">{rows.length}</span>
              </label>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(ids, "approve")}><Check className="h-3.5 w-3.5" /> Approve all</Button>
              </div>
            </div>
            <ul className="divide-y divide-line">
              {rows.map((item) => (
                <li key={item.id} className={cn("px-4 py-3 transition-colors", selected.has(item.id) && "bg-brand-soft/40")}>
                  {editing === item.id ? (
                    <ItemEditor
                      item={item}
                      categories={categories}
                      onCancel={() => setEditing(null)}
                      onSaved={(updated) => { setItems((prev) => (prev ?? []).map((i) => (i.id === updated.id ? updated : i))); setEditing(null); }}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} aria-label={`Select ${item.name}`} className="h-4 w-4 shrink-0 rounded border-line-strong accent-[var(--color-brand)]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-ink">{item.name}</span>
                          <SourceBadge source={item.source} externalId={item.externalId} />
                        </div>
                        {item.description && <p className="truncate text-xs text-muted">{item.description}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => setEditing(item.id)} aria-label={`Edit ${item.name}`} className="rounded-lg p-2 text-muted hover:bg-surface-strong hover:text-ink"><Pencil className="h-4 w-4" /></button>
                        <button type="button" disabled={busy} onClick={() => act([item.id], "reject")} aria-label={`Reject ${item.name}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"><X className="h-4 w-4" /></button>
                        <button type="button" disabled={busy} onClick={() => act([item.id], "approve")} aria-label={`Approve ${item.name}`} className="rounded-lg bg-brand-soft p-2 text-brand hover:bg-brand hover:text-surface disabled:opacity-40"><Check className="h-4 w-4" /></button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-10 mx-auto flex w-fit items-center gap-3 rounded-2xl border border-line bg-ink px-4 py-3 text-surface shadow-xl">
          <span className="text-sm"><span className="font-semibold tabular-nums">{selectedIds.length}</span> selected</span>
          <Button size="sm" variant="onGradient" disabled={busy} onClick={() => act(selectedIds, "approve")}><Check className="h-3.5 w-3.5" /> Approve</Button>
          <Button size="sm" variant="outlineOnGradient" disabled={busy} onClick={() => act(selectedIds, "reject")}><X className="h-3.5 w-3.5" /> Reject</Button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-surface/70 hover:text-surface">Clear</button>
        </div>
      )}
    </div>
  );
}
