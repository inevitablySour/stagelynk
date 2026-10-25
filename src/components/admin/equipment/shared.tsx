"use client";

import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EQUIPMENT_GROUPS } from "@/lib/equipment-catalog/groups";
import { cn } from "@/lib/utils";

export type ItemStatus = "active" | "pending" | "rejected" | "hidden" | "retired";
export type ItemSource = "custom" | "shopify" | "wikidata";

export interface AdminItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  group: string;
  kind: "hardware" | "software";
  source: ItemSource;
  externalId: string | null;
  path: string;
  description: string | null;
  status: ItemStatus;
  adminLocked: boolean;
  addedManually: boolean;
  lastSyncedAt: string | null;
  usage: number;
}

export interface AdminListResponse {
  items: AdminItem[];
  total: number;
  page: number;
  pageSize: number;
  categories: { group: string; category: string }[];
  counts: { status: Partial<Record<ItemStatus, number>>; source: Partial<Record<ItemSource, number>> };
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const json = await res.json().catch(() => ({ success: false, message: "Unexpected server response." }));
  if (!json.success) throw new Error(json.message ?? "Request failed.");
  return json.data as T;
}

const STATUS_STYLES: Record<ItemStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
  hidden: "bg-stone-200 text-stone-700",
  retired: "border border-dashed border-stone-300 text-stone-500",
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", STATUS_STYLES[status])}>{status}</span>;
}

const SOURCE_LABEL: Record<ItemSource, string> = { custom: "Custom", shopify: "Shopify", wikidata: "Wikidata" };

export function SourceBadge({ source, externalId }: { source: ItemSource; externalId: string | null }) {
  const content = <span className="inline-flex rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted">{SOURCE_LABEL[source]}</span>;
  if (source === "wikidata" && externalId) {
    return <a href={`https://www.wikidata.org/wiki/${externalId}`} target="_blank" rel="noreferrer" className="hover:opacity-80" title={`Open ${externalId} on Wikidata`}>{content}</a>;
  }
  return content;
}

export function selectClass() {
  return "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
}

/** Edit form for a single item. Saving name/category/group locks synced items. */
export function ItemEditor({
  item, categories, onSaved, onCancel,
}: { item: AdminItem; categories: { group: string; category: string }[]; onSaved: (item: AdminItem) => void; onCancel: () => void }) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [group, setGroup] = useState(item.group);
  const [kind, setKind] = useState(item.kind);
  const [description, setDescription] = useState(item.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listId = `categories-${item.id}`;

  async function save(extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      const updated = await requestJson<AdminItem>(`/api/admin/equipment/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, category, group, kind, description: description.trim() || null, ...extra }),
      });
      onSaved({ ...item, ...updated });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium text-muted">Name<Input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="space-y-1 text-xs font-medium text-muted">
          Category
          <Input value={category} onChange={(e) => setCategory(e.target.value)} list={listId} />
          <datalist id={listId}>{categories.filter((c) => c.group === group).map((c) => <option key={c.category} value={c.category} />)}</datalist>
        </label>
        <label className="space-y-1 text-xs font-medium text-muted">
          Group
          <select value={group} onChange={(e) => setGroup(e.target.value)} className={selectClass()}>
            {EQUIPMENT_GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-muted">
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value as AdminItem["kind"])} className={selectClass()}>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-xs font-medium text-muted">
        Description <span className="font-normal">(admin reference only)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={2} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
      </label>
      {item.source !== "custom" && (
        <p className="flex items-start gap-2 rounded-lg bg-surface-strong px-3 py-2 text-xs text-muted">
          {item.adminLocked ? <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <LockOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          {item.adminLocked
            ? "Locked: future syncs won't overwrite this item's name, category or group."
            : "Changing the name, category or group locks this item so future syncs keep your edits."}
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => save()} disabled={busy || name.trim().length < 2 || category.trim().length < 2}>{busy ? "Saving…" : "Save changes"}</Button>
        {item.adminLocked && item.source !== "custom" && (
          <Button size="sm" variant="outline" onClick={() => save({ unlock: true })} disabled={busy}>Let sync manage again</Button>
        )}
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </div>
  );
}
