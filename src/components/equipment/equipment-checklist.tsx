"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EquipmentPicker, type EquipmentSelection } from "@/components/equipment/equipment-picker";
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
  /** Offer creative software too (e.g. "tools I bring"); riders and venues are hardware only. */
  includeSoftware?: boolean;
}

const serialize = (entries: EquipmentSelection[]) =>
  JSON.stringify([...entries].sort((a, b) => a.equipmentId.localeCompare(b.equipmentId)).map((e) => [e.equipmentId, e.quantity]));

export function EquipmentChecklist({ title, description, mode, endpoint, initial, includeSoftware = false }: EquipmentChecklistProps) {
  const [catalog, setCatalog] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<EquipmentSelection[]>(initial.map(({ equipmentId, quantity }) => ({ equipmentId, quantity })));
  const [savedKey, setSavedKey] = useState(() => serialize(initial));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const dirty = serialize(selection) !== savedKey;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const entries = selection.map((s) => ({ ...s, notes: notesById.get(s.equipmentId) ?? "" }));
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "needs" ? { needs: entries } : { offerings: entries }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Couldn't save your changes.");
        return;
      }
      setSavedKey(serialize(selection));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch {
      setError("Couldn't save your changes right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-6 overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <EquipmentPicker catalog={catalog} value={selection} onChange={(next) => { setSelection(next); setJustSaved(false); }} includeSoftware={includeSoftware} loading={loading} />
      </CardContent>
      <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-strong/50 px-6 py-3">
        <p className="flex items-center gap-2 text-sm" role="status">
          {justSaved ? (
            <><CircleCheck className="h-4 w-4 text-emerald-600" /><span className="text-emerald-700">Saved</span></>
          ) : dirty ? (
            <><span className="h-2 w-2 rounded-full bg-accent" /><span className="text-muted">Unsaved changes</span></>
          ) : (
            <span className="text-muted">{selection.length} {selection.length === 1 ? "item" : "items"} listed</span>
          )}
        </p>
        <Button onClick={handleSave} disabled={saving || loading || !dirty}>
          {saving ? "Saving…" : mode === "needs" ? "Save technical rider" : "Save equipment"}
        </Button>
      </div>
    </Card>
  );
}
