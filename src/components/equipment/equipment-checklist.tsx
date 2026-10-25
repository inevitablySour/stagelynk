"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleCheck, Pencil, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EquipmentPickerDialog, EquipmentSummary, type EquipmentSelection } from "@/components/equipment/equipment-picker-dialog";
import type { EquipmentItem } from "@/types";

interface InitialEntry {
  equipmentId: string;
  quantity: number;
  notes: string;
}

interface EquipmentChecklistProps {
  title: string;
  description: string;
  /** Selects the request body key the endpoint expects. */
  mode: "needs" | "offerings";
  endpoint: string;
  initial: InitialEntry[];
}

export function EquipmentChecklist({ title, description, mode, endpoint, initial }: EquipmentChecklistProps) {
  const [catalog, setCatalog] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<EquipmentSelection[]>(initial.map(({ equipmentId, quantity }) => ({ equipmentId, quantity })));
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const notesById = useMemo(() => new Map(initial.map((e) => [e.equipmentId, e.notes])), [initial]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/equipment")
      .then((res) => res.json())
      .then((json) => { if (!cancelled && json.success) setCatalog(json.data); })
      .catch(() => { if (!cancelled) setError("Couldn't load the equipment catalog. Refresh the page to try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function save(next: EquipmentSelection[]): Promise<string | null> {
    const entries = next.map((s) => ({ ...s, notes: notesById.get(s.equipmentId) ?? "" }));
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "needs" ? { needs: entries } : { offerings: entries }),
    });
    const json = await res.json();
    if (!json.success) return json.message ?? "Couldn't save your changes.";
    setSelection(next);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
    return null;
  }

  return (
    <Card className="mt-6 overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setOpen(true)} disabled={loading || catalog.length === 0}>
          {selection.length ? <><Pencil className="h-3.5 w-3.5" /> Edit</> : <><Plus className="h-4 w-4" /> Add</>}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <EquipmentSummary catalog={catalog} value={selection} loading={loading} onOpen={() => setOpen(true)} />
        <p className="flex items-center gap-2 text-xs text-muted" role="status">
          {justSaved ? <><CircleCheck className="h-4 w-4 text-emerald-600" /><span className="text-emerald-700">Saved</span></> : <>{selection.length} {selection.length === 1 ? "item" : "items"} listed</>}
        </p>
      </CardContent>
      <EquipmentPickerDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        catalog={catalog}
        value={selection}
        onApply={save}
        applyLabel={mode === "needs" ? "Save technical rider" : "Save equipment"}
      />
    </Card>
  );
}
