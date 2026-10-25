"use client";

import { useMemo, useState, type ComponentType } from "react";
import { AudioLines, Box, Cable, Camera, Check, Construction, Disc3, Guitar, Layers, Lightbulb, Minus, Plus, Projector, Search, Speaker, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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

const MAX_QUANTITY = 50;
const SEARCH_RESULT_LIMIT = 120;
const SELECTED_VIEW = "__selected";

const normalize = (value: string) => value.toLocaleLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Read-only chips for a card: what's currently chosen, without the picker. */
export function EquipmentSummary({
  catalog, value, loading, max = 8, onOpen, emptyLabel = "Browse and add items",
}: { catalog: EquipmentItem[]; value: EquipmentSelection[]; loading?: boolean; max?: number; onOpen: () => void; emptyLabel?: string }) {
  const byId = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);
  if (loading) return <div className="h-8 w-2/3 animate-pulse rounded-full bg-surface-strong" />;
  if (value.length === 0) {
    return (
      <button type="button" onClick={onOpen} className="w-full rounded-xl border border-dashed border-line-strong bg-page/30 px-4 py-6 text-center text-sm text-muted transition-colors hover:border-brand/50 hover:text-ink">
        Nothing listed yet. <span className="font-medium text-brand">{emptyLabel}</span>
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.slice(0, max).map((s) => {
        const item = byId.get(s.equipmentId);
        if (!item) return null;
        return (
          <span key={s.equipmentId} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink">
            {item.name}{item.kind === "hardware" && s.quantity > 1 && <span className="font-semibold text-brand">×{s.quantity}</span>}
          </span>
        );
      })}
      {value.length > max && <button type="button" onClick={onOpen} className="rounded-full px-2 py-1 text-xs font-medium text-brand hover:underline">+{value.length - max} more</button>}
    </div>
  );
}

interface EquipmentPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  catalog: EquipmentItem[];
  value: EquipmentSelection[];
  /** Resolve with an error message to keep the dialog open, or null/undefined to close it. */
  onApply: (next: EquipmentSelection[]) => Promise<string | null | void> | string | null | void;
  applyLabel?: string;
}

export function EquipmentPickerDialog({ open, onOpenChange, ...rest }: EquipmentPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <PickerBody onClose={() => onOpenChange(false)} {...rest} />}
    </Dialog>
  );
}

function PickerBody({
  onClose, title, description, catalog, value, onApply, applyLabel = "Save",
}: Omit<EquipmentPickerDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [draft, setDraft] = useState<EquipmentSelection[]>(value);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => new Map(draft.map((d) => [d.equipmentId, d.quantity])), [draft]);
  const byId = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);
  // Hidden or retired items only appear if already chosen, so existing picks stay editable.
  const offered = useMemo(() => catalog.filter((item) => item.status === "active" || selected.has(item.id)), [catalog, selected]);

  const groups = useMemo(
    () =>
      EQUIPMENT_GROUPS.map((g) => ({
        ...g,
        items: offered.filter((i) => i.group === g.key),
        picked: offered.filter((i) => i.group === g.key && selected.has(i.id)).length,
      })).filter((g) => g.items.length > 0),
    [offered, selected]
  );

  const [view, setView] = useState<string>(() => groups.find((g) => value.some((v) => byId.get(v.equipmentId)?.group === g.key))?.key ?? groups[0]?.key ?? "");
  const dirty = JSON.stringify([...draft].map((d) => [d.equipmentId, d.quantity]).sort()) !== JSON.stringify([...value].map((d) => [d.equipmentId, d.quantity]).sort());

  const trimmed = query.trim();
  const showingSelected = view === SELECTED_VIEW && !trimmed;
  const visible = useMemo(() => {
    if (trimmed) {
      const terms = normalize(trimmed).split(/\s+/);
      return offered.filter((i) => terms.every((t) => normalize(`${i.name} ${i.category} ${equipmentGroupLabel(i.group)}`).includes(t))).slice(0, SEARCH_RESULT_LIMIT);
    }
    if (showingSelected) return offered.filter((i) => selected.has(i.id));
    return offered.filter((i) => i.group === view);
  }, [offered, selected, trimmed, showingSelected, view]);

  const crossGroup = Boolean(trimmed) || showingSelected;
  const sections = useMemo(() => {
    const map = new Map<string, EquipmentItem[]>();
    for (const item of visible) {
      const key = crossGroup ? `${equipmentGroupLabel(item.group)} · ${item.category}` : item.category;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [visible, crossGroup]);

  const toggle = (id: string) => setDraft((d) => (d.some((x) => x.equipmentId === id) ? d.filter((x) => x.equipmentId !== id) : [...d, { equipmentId: id, quantity: 1 }]));
  const setQuantity = (id: string, q: number) => setDraft((d) => d.map((x) => (x.equipmentId === id ? { ...x, quantity: Math.min(MAX_QUANTITY, Math.max(1, q)) } : x)));

  async function apply() {
    setSaving(true);
    setError(null);
    try {
      const problem = await onApply(draft);
      if (problem) setError(problem);
      else onClose();
    } catch {
      setError("Couldn't save right now. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const railItem = (key: string, label: string, Icon: ComponentType<{ className?: string }>, count: number, picked: number) => {
    const active = !trimmed && view === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => { setQuery(""); setView(key); }}
        aria-current={active}
        className={cn(
          "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors md:w-full",
          active ? "bg-brand-soft font-semibold text-brand" : "text-ink hover:bg-surface-strong"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 whitespace-nowrap md:whitespace-normal">{label}</span>
        {picked > 0 ? <span className="rounded-full bg-brand px-1.5 text-[11px] font-semibold tabular-nums text-surface">{picked}</span> : <span className="hidden text-xs tabular-nums text-muted md:inline">{count}</span>}
      </button>
    );
  };

  return (
    <DialogContent
      className="h-[min(88vh,700px)] max-w-4xl"
      onPointerDownOutside={(e) => { if (dirty) e.preventDefault(); }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-3 pt-4">
        <div className="min-w-0">
          <DialogTitle className="text-lg font-semibold text-ink">{title}</DialogTitle>
          <DialogDescription className="mt-0.5 text-sm text-muted">{description ?? "Pick a group, or search the whole catalog."}</DialogDescription>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-muted hover:bg-surface-strong hover:text-ink"><X className="h-4 w-4" /></button>
      </div>

      <div className="border-b border-line px-5 py-3">
        <label className="relative block">
          <span className="sr-only">Search equipment</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            inputMode="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${offered.length} items: mixers, XLR cables, Ableton…`}
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-sm shadow-sm placeholder:text-muted/70 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-surface-strong hover:text-ink"><X className="h-4 w-4" /></button>}
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav aria-label="Equipment groups" className="flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-surface-strong/40 p-2 [scrollbar-width:none] md:w-60 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
          {railItem(SELECTED_VIEW, "Selected", Check, draft.length, draft.length)}
          <div className="mx-2 hidden border-t border-line md:my-1 md:block" />
          {groups.map((g) => railItem(g.key, g.label, GROUP_ICONS[g.key] ?? Box, g.items.length, g.picked))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-3 text-sm text-muted">
            {trimmed ? <>{visible.length}{visible.length === SEARCH_RESULT_LIMIT ? "+" : ""} results for <span className="font-medium text-ink">“{trimmed}”</span></>
              : showingSelected ? <>{draft.length} selected</>
              : <><span className="font-medium text-ink">{equipmentGroupLabel(view)}</span> · {visible.length} items</>}
          </p>
          {sections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong bg-page/30 px-5 py-10 text-center">
              <p className="font-medium text-ink">{showingSelected ? "Nothing selected yet" : `No matches for “${trimmed}”`}</p>
              <p className="mt-1 text-sm text-muted">{showingSelected ? "Pick a group on the left to add items." : "Try a broader term, like “cable” or “camera”."}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {sections.map(([heading, items]) => (
                <section key={heading}>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{heading}</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((item) => {
                      const quantity = selected.get(item.id);
                      const isSelected = quantity !== undefined;
                      return (
                        <div key={item.id} className={cn("flex items-center gap-2 rounded-xl border p-1.5 pl-2 transition-colors", isSelected ? "border-brand bg-brand-soft/60" : "border-line bg-surface hover:border-line-strong hover:bg-surface-strong/50")}>
                          <button type="button" onClick={() => toggle(item.id)} aria-pressed={isSelected} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors", isSelected ? "border-brand bg-brand text-surface" : "border-line-strong bg-surface")}>
                              {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                            </span>
                            <span className="min-w-0">
                              <span className="line-clamp-2 block break-words text-sm font-medium leading-snug text-ink">{item.name}</span>
                              {item.status !== "active" && <span className="block text-[11px] text-amber-700">No longer listed · kept on your profile</span>}
                            </span>
                          </button>
                          {isSelected && item.kind === "hardware" && (
                            <div className="flex shrink-0 items-center rounded-lg border border-line bg-surface">
                              <button type="button" onClick={() => setQuantity(item.id, quantity - 1)} disabled={quantity <= 1} aria-label={`Fewer ${item.name}`} className="flex h-7 w-7 items-center justify-center rounded-l-lg text-muted hover:bg-surface-strong hover:text-ink disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
                              <span className="w-7 text-center text-sm font-semibold tabular-nums text-ink" aria-label={`Quantity of ${item.name}`}>{quantity}</span>
                              <button type="button" onClick={() => setQuantity(item.id, quantity + 1)} disabled={quantity >= MAX_QUANTITY} aria-label={`More ${item.name}`} className="flex h-7 w-7 items-center justify-center rounded-r-lg text-muted hover:bg-surface-strong hover:text-ink disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-line bg-surface-strong/50 px-5 py-3">
        {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]" aria-label="Selected items">
            {draft.length === 0 ? <span className="text-sm text-muted">Nothing selected</span> : draft.map((d) => {
              const item = byId.get(d.equipmentId);
              if (!item) return null;
              return (
                <span key={d.equipmentId} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface py-0.5 pl-2.5 pr-1 text-xs text-ink">
                  {item.name}{item.kind === "hardware" && d.quantity > 1 && <span className="font-semibold text-brand">×{d.quantity}</span>}
                  <button type="button" onClick={() => toggle(d.equipmentId)} aria-label={`Remove ${item.name}`} className="rounded-full p-0.5 text-muted hover:bg-surface-strong hover:text-ink"><X className="h-3 w-3" /></button>
                </span>
              );
            })}
          </div>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={apply} disabled={saving || !dirty}>{saving ? "Saving…" : applyLabel}</Button>
        </div>
      </div>
    </DialogContent>
  );
}
