"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EquipmentItem } from "@/types";

interface SelectedEquipment {
  equipmentId: string;
  quantity: number;
  notes: string;
}

interface InitialEntry {
  equipmentId: string;
  quantity: number;
  notes: string;
}

interface EquipmentChecklistProps {
  title: string;
  description: string;
  /** "needs" shows "Artist must supply" framing, "offerings" shows "In-house" framing. */
  mode: "needs" | "offerings";
  endpoint: string;
  initial: InitialEntry[];
}

export function EquipmentChecklist({ title, description, mode, endpoint, initial }: EquipmentChecklistProps) {
  const [catalog, setCatalog] = useState<EquipmentItem[]>([]);
  const [selected, setSelected] = useState<Map<string, SelectedEquipment>>(
    new Map(initial.map((entry) => [entry.equipmentId, entry]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/equipment")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCatalog(json.data);
      }).catch(() => setError("Unable to load equipment. Please refresh the page."));
  }, []);

  function toggle(equipmentId: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(equipmentId)) {
        next.delete(equipmentId);
      } else {
        next.set(equipmentId, { equipmentId, quantity: 1, notes: "" });
      }
      return next;
    });
  }

  function updateQuantity(equipmentId: string, quantity: number) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Map(prev);
      const entry = next.get(equipmentId);
      if (entry) next.set(equipmentId, { ...entry, quantity: Math.max(1, quantity) });
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload =
        mode === "needs"
          ? { needs: Array.from(selected.values()) }
          : { offerings: Array.from(selected.values()) };

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to save your technical rider.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Unable to save your technical rider right now.");
    } finally {
      setSaving(false);
    }
  }

  const categories = Array.from(new Set(catalog.map((item) => item.category)));

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {categories.map((category) => (
          <div key={category}>
            <h3 className="mb-2 text-sm font-semibold text-stone-700">{category}</h3>
            <div className="space-y-2">
              {catalog
                .filter((item) => item.category === category)
                .map((item) => {
                  const entry = selected.get(item.id);
                  const isChecked = Boolean(entry);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 px-3 py-2"
                    >
                      <label className="flex flex-1 items-center gap-2 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(item.id)}
                          className="rounded border-stone-300"
                        />
                        {item.name}
                      </label>
                      {isChecked && (
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={entry!.quantity}
                          onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                          className="w-16 text-center"
                          aria-label={`Quantity of ${item.name}`}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
        {saved && <p className="text-sm text-emerald-600">Saved.</p>}
        <Button onClick={handleSave} disabled={saving || catalog.length === 0}>
          {saving ? "Saving..." : mode === "needs" ? "Save technical rider" : "Save equipment"}
        </Button>
      </CardContent>
    </Card>
  );
}
