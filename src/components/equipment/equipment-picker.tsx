"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  AudioLines, Box, Cable, Camera, Check, Construction, Disc3, Guitar, Layers, Lightbulb,
  Minus, Plus, Projector, Search, Speaker, X, ArrowLeft,
} from "lucide-react";
import { EQUIPMENT_GROUPS, equipmentGroupLabel } from "@/lib/equipment-catalog/groups";
import type { EquipmentItem } from "@/types";
import { cn } from "@/lib/utils";

const GROUP_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  instruments: Guitar, backline: Speaker, "live-sound": AudioLines, dj: Disc3, lighting: Lightbulb,
  staging: Construction, video: Projector, cameras: Camera, cabling: Cable, software: Layers, other: Box,
};

export interface EquipmentSelection {
  equipmentId: string;
  quantity: number;
}

interface EquipmentPickerProps {
  catalog: EquipmentItem[];
  value: EquipmentSelection[];
  onChange: (next: EquipmentSelection[]) => void;
  loading?: boolean;
}

const MAX_QUANTITY = 50;
const SEARCH_RESULT_LIMIT = 120;

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export function EquipmentPicker({ catalog, value, onChange, loading = false }: EquipmentPickerProps) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [showSelected, setShowSelected] = useState(false);

  const selected = useMemo(() => new Map(value.map((v) => [v.equipmentId, v.quantity])), [value]);
  const byId = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);

  // Only active items are offered; hidden/retired ones appear only if already chosen.
  const offered = useMemo(
    () => catalog.filter((item) => item.status === "active" || selected.has(item.id)),
    [catalog, selected]
  );

  const groups = useMemo(
    () =>
      EQUIPMENT_GROUPS.map((g) => ({
        ...g,
        items: offered.filter((item) => item.group === g.key),
        selectedCount: offered.filter((item) => item.group === g.key && selected.has(item.id)).length,
      })).filter((g) => g.items.length > 0),
    [offered, selected]
  );

  const trimmed = query.trim();
  const visible = useMemo(() => {
    if (showSelected) return offered.filter((item) => selected.has(item.id));
    if (trimmed) {
      const terms = normalize(trimmed).split(/\s+/);
      return offered
        .filter((item) => !group || item.group === group)
        .filter((item) => {
          const haystack = normalize(`${item.name} ${item.category} ${equipmentGroupLabel(item.group)}`);
          return terms.every((t) => haystack.includes(t));
        })
        .slice(0, SEARCH_RESULT_LIMIT);
    }
    return group ? offered.filter((item) => item.group === group) : [];
  }, [offered, selected, showSelected, trimmed, group]);

  const sections = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>();
    const crossGroup = showSelected || (Boolean(trimmed) && !group);
    for (const item of visible) {
      const key = crossGroup ? `${equipmentGroupLabel(item.group)} · ${item.category}` : item.category;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [visible, showSelected, trimmed, group]);

  function toggle(id: string) {
    if (selected.has(id)) onChange(value.filter((v) => v.equipmentId !== id));
    else onChange([...value, { equipmentId: id, quantity: 1 }]);
  }

  function setQuantity(id: string, quantity: number) {
    const clamped = Math.min(MAX_QUANTITY, Math.max(1, quantity));
    onChange(value.map((v) => (v.equipmentId === id ? { ...v, quantity: clamped } : v)));
  }

  const browsingHome = !group && !trimmed && !showSelected;
  const activeGroup = groups.find((g) => g.key === group);

  return (
    <div className="@container space-y-4">
      <div className="flex flex-col gap-2 @md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search equipment</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => {
              // A new search looks across every group; refining an existing one keeps the chosen group.
              if (!query.trim() && e.target.value.trim()) setGroup(null);
              setQuery(e.target.value);
              setShowSelected(false);
            }}
            placeholder={loading ? "Loading catalog…" : `Search ${offered.length} items: mixers, XLR cables, Ableton…`}
            disabled={loading}
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-sm shadow-sm transition-colors placeholder:text-muted/70 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-surface-strong hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setShowSelected((v) => !v)}
          aria-pressed={showSelected}
          disabled={value.length === 0}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            showSelected ? "border-brand bg-brand text-surface" : "border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-strong"
          )}
        >
          <Check className="h-4 w-4" />
          Selected
          <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", showSelected ? "bg-surface/20" : "bg-brand-soft text-brand")}>{value.length}</span>
        </button>
      </div>

      {!browsingHome && !showSelected && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [mask-image:linear-gradient(to_right,black_90%,transparent)] [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => setGroup(null)}
            className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", !group ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:border-line-strong hover:text-ink")}
          >
            {trimmed ? "All groups" : <><ArrowLeft className="h-3.5 w-3.5" /> All groups</>}
          </button>
          {groups.map((g) => {
            const Icon = GROUP_ICONS[g.key] ?? Box;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setGroup(g.key)}
                aria-pressed={group === g.key}
                className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", group === g.key ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:border-line-strong hover:text-ink")}
              >
                <Icon className="h-3.5 w-3.5" />
                {g.label}
                {g.selectedCount > 0 && <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold text-surface">{g.selectedCount}</span>}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 @md:grid-cols-2 @2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-strong" />)}
        </div>
      ) : browsingHome ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 @md:grid-cols-2 @2xl:grid-cols-3">
          {groups.map((g) => {
            const Icon = GROUP_ICONS[g.key] ?? Box;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setGroup(g.key)}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_14px_40px_-28px_rgba(47,59,29,0.5)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-surface">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-tight text-ink">{g.label}</span>
                  <span className="text-xs text-muted">{g.items.length} items</span>
                </span>
                {g.selectedCount > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold tabular-nums text-surface">{g.selectedCount}</span>}
              </button>
            );
          })}
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-page/30 px-5 py-10 text-center">
          <p className="font-medium text-ink">{showSelected ? "Nothing selected yet" : `No matches for “${trimmed}”`}</p>
          <p className="mt-1 text-sm text-muted">{showSelected ? "Browse a group or search to add items." : "Try a broader term, like “cable” or “camera”."}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {activeGroup && !trimmed && !showSelected && (
            <p className="text-sm text-muted">{activeGroup.items.length} items in <span className="font-medium text-ink">{activeGroup.label}</span></p>
          )}
          {sections.map(([title, items]) => (
            <section key={title}>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{title}</h4>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2 @md:grid-cols-2 @3xl:grid-cols-3">
                {items.map((item) => {
                  const quantity = selected.get(item.id);
                  const isSelected = quantity !== undefined;
                  const unlisted = item.status !== "active";
                  const countable = item.kind === "hardware";
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-1.5 pl-2 transition-all",
                        isSelected ? "border-brand bg-brand-soft/60 shadow-sm" : "border-line bg-surface hover:border-line-strong hover:bg-surface-strong/50"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        aria-pressed={isSelected}
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors", isSelected ? "border-brand bg-brand text-surface" : "border-line-strong bg-surface")}>
                          {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 block break-words text-sm font-medium leading-snug text-ink">{item.name}</span>
                          {unlisted && <span className="block text-[11px] text-amber-700">No longer listed · kept on your profile</span>}
                        </span>
                      </button>
                      {isSelected && countable && (
                        <div className="flex shrink-0 items-center rounded-lg border border-line bg-surface">
                          <button type="button" onClick={() => setQuantity(item.id, quantity - 1)} disabled={quantity <= 1} aria-label={`Fewer ${item.name}`} className="flex h-7 w-7 items-center justify-center rounded-l-lg text-muted hover:bg-surface-strong hover:text-ink disabled:opacity-40">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold tabular-nums text-ink" aria-label={`Quantity of ${item.name}`}>{quantity}</span>
                          <button type="button" onClick={() => setQuantity(item.id, quantity + 1)} disabled={quantity >= MAX_QUANTITY} aria-label={`More ${item.name}`} className="flex h-7 w-7 items-center justify-center rounded-r-lg text-muted hover:bg-surface-strong hover:text-ink disabled:opacity-40">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {trimmed && visible.length === SEARCH_RESULT_LIMIT && <p className="text-xs text-muted">Showing the first {SEARCH_RESULT_LIMIT} matches. Narrow your search to see more.</p>}
        </div>
      )}

      {value.length > 0 && !showSelected && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          <span className="mr-1 text-xs font-medium text-muted">Your list:</span>
          {value.slice(0, 10).map((v) => {
            const item = byId.get(v.equipmentId);
            if (!item) return null;
            return (
              <span key={v.equipmentId} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-0.5 pl-2.5 pr-1 text-xs text-ink">
                {item.name}{item.kind === "hardware" && v.quantity > 1 && <span className="font-semibold text-brand">×{v.quantity}</span>}
                <button type="button" onClick={() => toggle(v.equipmentId)} aria-label={`Remove ${item.name}`} className="rounded-full p-0.5 text-muted hover:bg-surface-strong hover:text-ink">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          {value.length > 10 && (
            <button type="button" onClick={() => setShowSelected(true)} className="text-xs font-medium text-brand hover:underline">+{value.length - 10} more</button>
          )}
        </div>
      )}
    </div>
  );
}
