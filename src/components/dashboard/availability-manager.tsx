"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AvailabilitySlot } from "@/types";

type DraftSlot = Omit<AvailabilitySlot, "id"> & { id?: string };

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function AvailabilityManager({ initial }: { initial: AvailabilitySlot[] }) {
  const [slots, setSlots] = useState<DraftSlot[]>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function addSlot() {
    const today = new Date().toISOString().slice(0, 10);
    setSlots((prev) => [...prev, { startDate: today, endDate: today }]);
  }

  function updateSlot(index: number, patch: Partial<DraftSlot>) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/musicians/me/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: slots.map((s) => ({ startDate: s.startDate, endDate: s.endDate })) }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.message ?? "Unable to save availability.");
        return;
      }
      setMessage("Saved.");
    } catch {
      setMessage("Unable to save availability right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Availability</CardTitle>
        <CardDescription>
          Open date ranges when you&apos;re available for bookings. Venues can filter search by a specific date.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {slots.map((slot, index) => (
          <div key={slot.id ?? index} className="flex flex-wrap items-end gap-2 rounded-lg border border-stone-100 p-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">From</label>
              <Input
                type="date"
                value={toDateInput(slot.startDate)}
                onChange={(e) => updateSlot(index, { startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">To</label>
              <Input
                type="date"
                value={toDateInput(slot.endDate)}
                onChange={(e) => updateSlot(index, { endDate: e.target.value })}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => removeSlot(index)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addSlot}>
          <Plus className="mr-2 h-4 w-4" /> Add availability window
        </Button>

        <div className="flex items-center gap-3 pt-2">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save availability"}
          </Button>
          {message && <span className="text-sm text-stone-500">{message}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
