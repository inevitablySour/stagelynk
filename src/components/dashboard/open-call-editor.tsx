"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HierarchicalPicker } from "@/components/common/hierarchical-picker";
import { EquipmentPicker } from "@/components/equipment/equipment-picker";
import { GENRE_GROUPS } from "@/config";
import type { OpenCallRow } from "@/lib/open-calls";
import type { EquipmentItem } from "@/types";
import { eventInstants } from "@/lib/open-call-utils";

const GENRE_PICKER_GROUPS = GENRE_GROUPS.map((g) => ({
  id: g.slug, name: g.name, children: g.subgenres.map((s) => ({ id: s.slug, name: s.name })),
}));
const ALL_SUBGENRE_SLUGS = new Set(GENRE_GROUPS.flatMap((g) => g.subgenres.map((s) => s.slug)));

export function OpenCallEditor({ initial, copy = false, onSaved, onCancel }: { initial?: OpenCallRow; copy?: boolean; onSaved: () => void; onCancel: () => void }) {
  const [genres, setGenres] = useState(initial?.genres.filter((slug) => ALL_SUBGENRE_SLUGS.has(slug)) ?? []);
  const [genreGroups, setGenreGroups] = useState(
    Array.from(new Set(genres.map((slug) => GENRE_GROUPS.find((g) => g.subgenres.some((s) => s.slug === slug))?.slug).filter((v): v is string => Boolean(v))))
  );
  const [slots, setSlots] = useState(initial?.slots.map((slot) => ({ label: slot.label, budgetMin: slot.budgetMin == null ? "" : String(slot.budgetMin), budgetMax: slot.budgetMax == null ? "" : String(slot.budgetMax) })) ?? [{ label: "Performance", budgetMin: "", budgetMax: "" }]);
  const [useVenueEquipment, setUseVenueEquipment] = useState(initial?.useVenueEquipment ?? true);
  const [equipment, setEquipment] = useState(initial?.eventEquipment ?? []);
  const [catalog, setCatalog] = useState<EquipmentItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/equipment").then((response) => response.json()).then((json) => {
      if (json.success) setCatalog(json.data);
    }).catch(() => setError("Equipment catalog could not load. Refresh before editing the technical setup."));
  }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const status = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ?? "draft";
    setBusy(true);
    setError("");
    try {
      const deadline = text("applicationDeadline");
      const applicationDeadline = deadline ? eventInstants(deadline.slice(0, 10), deadline.slice(11, 16), "23:59", text("timeZone")).eventStartsAt.toISOString() : "";
      const response = await fetch(initial && !copy ? `/api/venues/jobs/${initial.id}` : "/api/venues/jobs", {
        method: initial && !copy ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: text("title"), description: text("description"), eventType: text("eventType"),
          eventDate: text("eventDate"), startTime: text("startTime") || undefined, endTime: text("endTime") || undefined,
          timeZone: text("timeZone"), location: text("location"), venueAddress: text("venueAddress"),
          externalVenueName: text("externalVenueName"), stageSpecs: text("stageSpecs"),
          budgetMin: Number(text("budgetMin")), budgetMax: Number(text("budgetMax")), currency: "EUR",
          applicationDeadline, genres, useVenueEquipment, eventEquipment: equipment,
          equipmentProvided: equipment.map((item) => `${item.quantity}× ${catalog.find((entry) => entry.id === item.equipmentId)?.name ?? "Equipment"}`),
          requiredServices: text("requiredServices").split(",").map((item) => item.trim()).filter(Boolean),
          slots: slots.map((slot) => ({ label: slot.label, budgetMin: slot.budgetMin === "" ? null : Number(slot.budgetMin), budgetMax: slot.budgetMax === "" ? null : Number(slot.budgetMax) })),
          status,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        const issues = json.errors?.fieldErrors ? Object.values(json.errors.fieldErrors).flat().join(" ") : "";
        throw new Error(issues || json.message || "Unable to save the call.");
      }
      onSaved();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  const field = (name: string, label: string, value: string | number | null | undefined, type = "text") => (
    <div><label htmlFor={`call-${name}`} className="mb-2 block text-sm font-medium">{label}</label><Input id={`call-${name}`} name={name} type={type} defaultValue={value ?? ""} step={type === "number" ? "0.01" : undefined} min={type === "number" ? 0 : undefined} /></div>
  );
  const timeZone = initial?.timeZone ?? "Europe/Brussels";
  const deadlineValue = initial?.applicationDeadline ? new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(initial.applicationDeadline)).replace(" ", "T") : "";
  return <Card className="mb-6 rounded-2xl"><CardHeader><CardTitle>{initial ? "Edit open call" : "Create an open call"}</CardTitle><p className="text-sm leading-6 text-muted">Save a partial draft, or complete the schedule, stage brief, genre and positive payout range to publish. Times use the event time zone; an end time before the start means the following day.</p></CardHeader><CardContent>
    <form onSubmit={save} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">{field("title", "Call title", initial?.title)}{field("eventType", "Event / project type", initial?.eventType ?? "Live performance")}</div>
      <div><label htmlFor="call-description" className="mb-2 block text-sm font-medium">The brief</label><textarea id="call-description" name="description" defaultValue={initial?.description} minLength={20} maxLength={5000} className="min-h-28 w-full rounded-xl border border-line bg-surface p-3 text-sm" placeholder="Describe the opportunity and what you're looking for." /></div>
      <div className="grid gap-4 sm:grid-cols-3">{field("eventDate", "Event date", initial?.eventDate, "date")}{field("startTime", "Start time", initial?.startTime, "time")}{field("endTime", "End time", initial?.endTime, "time")}</div>
      <div className="grid gap-4 sm:grid-cols-2">{field("timeZone", "Event time zone (IANA)", timeZone)}{field("applicationDeadline", "Apply before (event time zone)", deadlineValue, "datetime-local")}</div>
      <div className="grid gap-4 sm:grid-cols-2">{field("location", "City / region", initial?.location)}{field("venueAddress", "Event address", initial?.venueAddress)}{field("externalVenueName", "Partner / external venue (for promoters)", initial?.externalVenueName)}</div>
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Target genres</legend>
        <p className="mb-2 text-xs text-muted">Not limited to one genre or group — target whichever genres and subgenres fit this call.</p>
        <HierarchicalPicker
          groups={GENRE_PICKER_GROUPS}
          selectedGroupIds={genreGroups}
          selectedChildIds={genres}
          onGroupToggle={(groupId) => setGenreGroups((prev) => {
            if (prev.includes(groupId)) {
              const group = GENRE_PICKER_GROUPS.find((g) => g.id === groupId);
              if (group) setGenres((cur) => cur.filter((id) => !group.children.some((c) => c.id === id)));
              return prev.filter((g) => g !== groupId);
            }
            return [...prev, groupId];
          })}
          onChildToggle={(slug) => setGenres((prev) => prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug])}
          mode="filter"
          groupLabel="Genre"
          childLabel="Subgenre"
        />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">{field("budgetMin", "Minimum artist fee (EUR)", initial?.budgetMin, "number")}{field("budgetMax", "Maximum artist fee (EUR)", initial?.budgetMax, "number")}</div>
      <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Lineup slots</legend><p className="text-xs text-muted">One artist per slot. Optional slot budgets override the call&apos;s range; fill both limits or neither.</p>{slots.map((slot, index) => <div key={index} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_110px_110px_auto]"><Input aria-label={`Slot ${index + 1} label`} value={slot.label} onChange={(event) => setSlots((previous) => previous.map((item, position) => position === index ? { ...item, label: event.target.value } : item))} placeholder="Opener / Support / Co-headliner" />{(["budgetMin", "budgetMax"] as const).map((key) => <Input key={key} aria-label={`Slot ${index + 1} ${key}`} type="number" min={0} step="0.01" placeholder={key === "budgetMin" ? "Min EUR" : "Max EUR"} value={slot[key]} onChange={(event) => setSlots((previous) => previous.map((item, position) => position === index ? { ...item, [key]: event.target.value } : item))} />)}<Button type="button" variant="ghost" disabled={slots.length === 1} onClick={() => setSlots((previous) => previous.filter((_, position) => position !== index))}>Remove</Button></div>)}<Button type="button" variant="outline" disabled={slots.length >= 20} onClick={() => setSlots((previous) => [...previous, { label: "", budgetMin: "", budgetMax: "" }])}>Add lineup slot</Button></fieldset>
      <div><label htmlFor="call-stageSpecs" className="mb-2 block text-sm font-medium">Stage setup & technical specifications</label><textarea id="call-stageSpecs" name="stageSpecs" defaultValue={initial?.stageSpecs} maxLength={3000} className="min-h-24 w-full rounded-xl border border-line bg-surface p-3 text-sm" placeholder="Stage dimensions, power, access, soundcheck, limits…" /></div>
      {field("requiredServices", "Required services (comma-separated)", initial?.requiredServices.join(", "))}
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={useVenueEquipment} onChange={(event) => setUseVenueEquipment(event.target.checked)} />Use my venue&apos;s current in-house equipment for technical matching</label>
      {!useVenueEquipment && (
        <fieldset className="rounded-2xl border border-line p-4">
          <legend className="px-1 text-sm font-medium">Equipment at this event / external venue</legend>
          <EquipmentPicker catalog={catalog} value={equipment} onChange={setEquipment} loading={catalog.length === 0 && !error} />
          <p className="mt-3 text-xs text-muted">An empty list explicitly means no equipment is provided.</p>
        </fieldset>
      )}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" value="draft" variant="outline" disabled={busy}>Save draft</Button><Button type="submit" value="published" disabled={busy}>{busy ? "Saving…" : "Save & publish"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button></div>
    </form>
  </CardContent></Card>;
}
