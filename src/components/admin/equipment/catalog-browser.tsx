"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Lock, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EQUIPMENT_GROUPS, equipmentGroupLabel } from "@/lib/equipment-catalog/groups";
import { cn } from "@/lib/utils";
import {
  ItemEditor, SourceBadge, StatusBadge, requestJson, selectClass,
  type AdminItem, type AdminListResponse, type ItemStatus,
} from "@/components/admin/equipment/shared";

export function CatalogBrowser({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<ItemStatus | "">("active");
  const [source, setSource] = useState("");
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminListResponse | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page) });
    if (debounced) params.set("q", debounced);
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (group) params.set("group", group);
    requestJson<AdminListResponse>(`/api/admin/equipment?${params}`)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [debounced, status, source, group, page, refreshKey]);

  function replace(updated: AdminItem) {
    setData((prev) => (prev ? { ...prev, items: prev.items.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)) } : prev));
  }

  async function setItemStatus(item: AdminItem, next: ItemStatus) {
    setBusyId(item.id);
    try {
      replace(await requestJson<AdminItem>(`/api/admin/equipment/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) }));
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const filterChange = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search name or category" className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
        </label>
        <select aria-label="Status" value={status} onChange={(e) => filterChange(setStatus)(e.target.value as ItemStatus | "")} className={selectClass()}>
          <option value="">All statuses</option>
          {(["active", "pending", "hidden", "rejected", "retired"] as const).map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}{data?.counts.status[s] !== undefined ? ` (${data.counts.status[s]})` : ""}</option>
          ))}
        </select>
        <select aria-label="Source" value={source} onChange={(e) => filterChange(setSource)(e.target.value)} className={selectClass()}>
          <option value="">All sources</option>
          <option value="shopify">Shopify</option>
          <option value="wikidata">Wikidata</option>
          <option value="custom">Custom</option>
        </select>
        <select aria-label="Group" value={group} onChange={(e) => filterChange(setGroup)(e.target.value)} className={selectClass()}>
          <option value="">All groups</option>
          {EQUIPMENT_GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_90px_80px_60px_96px] gap-3 border-b border-line bg-surface-strong/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted md:grid">
          <span>Item</span><span>Group · category</span><span>Source</span><span>Status</span><span title="Profiles and venues listing this item">In use</span><span />
        </div>
        {data === null ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-strong" />)}</div>
        ) : data.items.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">No items match these filters.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.items.map((item) => (
              <li key={item.id} className={cn(editing === item.id && "bg-surface-strong/40")}>
                <div className="grid items-center gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_90px_80px_60px_96px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">{item.name}</span>
                    {item.adminLocked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted" aria-label="Edited by an admin; syncs won't overwrite" />}
                    {item.kind === "software" && <span className="rounded bg-brand-soft px-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand">SW</span>}
                  </div>
                  <span className="truncate text-xs text-muted">{equipmentGroupLabel(item.group)} · {item.category}</span>
                  <span><SourceBadge source={item.source} externalId={item.externalId} /></span>
                  <span><StatusBadge status={item.status} /></span>
                  <span className="text-xs tabular-nums text-muted">{item.usage}</span>
                  <div className="flex justify-end gap-1">
                    {item.status === "active" ? (
                      <button type="button" disabled={busyId === item.id} onClick={() => setItemStatus(item, "hidden")} title="Hide from pickers" className="rounded-lg p-2 text-muted hover:bg-surface-strong hover:text-ink disabled:opacity-40"><EyeOff className="h-4 w-4" /></button>
                    ) : item.status !== "retired" ? (
                      <button type="button" disabled={busyId === item.id} onClick={() => setItemStatus(item, "active")} title="Make active" className="rounded-lg p-2 text-brand hover:bg-brand-soft disabled:opacity-40"><Eye className="h-4 w-4" /></button>
                    ) : <span className="w-8" />}
                    <button type="button" onClick={() => setEditing(editing === item.id ? null : item.id)} title="Edit" className="rounded-lg p-2 text-muted hover:bg-surface-strong hover:text-ink"><Pencil className="h-4 w-4" /></button>
                  </div>
                </div>
                {editing === item.id && (
                  <div className="border-t border-line px-4 py-4">
                    {item.path && <p className="mb-3 truncate text-xs text-muted" title={item.path}>Source path: {item.path}</p>}
                    <ItemEditor item={item} categories={data.categories} onCancel={() => setEditing(null)} onSaved={(u) => { replace(u); setEditing(null); onChanged(); }} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
