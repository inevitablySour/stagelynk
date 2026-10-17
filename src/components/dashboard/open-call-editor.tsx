"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GENRES } from "@/config";
import type { OpenCallRow } from "@/lib/open-calls";
import type { EquipmentItem } from "@/types";
import { eventInstants } from "@/lib/open-call-utils";

export function OpenCallEditor({ initial, copy = false, onSaved, onCancel }: { initial?: OpenCallRow; copy?: boolean; onSaved: () => void; onCancel: () => void }) {
  const [genres, setGenres] = useState(initial?.genres.filter((slug) => GENRES.some((genre) => genre.slug === slug)) ?? []);
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
          applicationDeadline, genres: [...genres, ...text("subgenres").split(",").map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean)], useVenueEquipment, eventEquipment: equipment,
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
      <fieldset><legend className="mb-3 text-sm font-medium">Target genres</legend><div className="flex flex-wrap gap-2">{GENRES.map((genre) => <button key={genre.slug} type="button" aria-pressed={genres.includes(genre.slug)} onClick={() => setGenres((previous) => previous.includes(genre.slug) ? previous.filter((item) => item !== genre.slug) : [...previous, genre.slug])} className={`rounded-full border px-3 py-1.5 text-xs ${genres.includes(genre.slug) ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"}`}>{genre.name}</button>)}</div></fieldset>
      {field("subgenres", "Target subgenres (comma-separated, optional)", initial?.genres.filter((slug) => !GENRES.some((genre) => genre.slug === slug)).join(", "))}
      <div className="grid gap-4 sm:grid-cols-2">{field("budgetMin", "Minimum artist fee (EUR)", initial?.budgetMin, "number")}{field("budgetMax", "Maximum artist fee (EUR)", initial?.budgetMax, "number")}</div>
      <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Lineup slots</legend><p className="text-xs text-muted">One artist per slot. Optional slot budgets override the call&apos;s range; fill both limits or neither.</p>{slots.map((slot, index) => <div key={index} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_110px_110px_auto]"><Input aria-label={`Slot ${index + 1} label`} value={slot.label} onChange={(event) => setSlots((previous) => previous.map((item, position) => position === index ? { ...item, label: event.target.value } : item))} placeholder="Opener / Support / Co-headliner" />{(["budgetMin", "budgetMax"] as const).map((key) => <Input key={key} aria-label={`Slot ${index + 1} ${key}`} type="number" min={0} step="0.01" placeholder={key === "budgetMin" ? "Min EUR" : "Max EUR"} value={slot[key]} onChange={(event) => setSlots((previous) => previous.map((item, position) => position === index ? { ...item, [key]: event.target.value } : item))} />)}<Button type="button" variant="ghost" disabled={slots.length === 1} onClick={() => setSlots((previous) => previous.filter((_, position) => position !== index))}>Remove</Button></div>)}<Button type="button" variant="outline" disabled={slots.length >= 20} onClick={() => setSlots((previous) => [...previous, { label: "", budgetMin: "", budgetMax: "" }])}>Add lineup slot</Button></fieldset>
      <div><label htmlFor="call-stageSpecs" className="mb-2 block text-sm font-medium">Stage setup & technical specifications</label><textarea id="call-stageSpecs" name="stageSpecs" defaultValue={initial?.stageSpecs} maxLength={3000} className="min-h-24 w-full rounded-xl border border-line bg-surface p-3 text-sm" placeholder="Stage dimensions, power, access, soundcheck, limits…" /></div>
      {field("requiredServices", "Required services (comma-separated)", initial?.requiredServices.join(", "))}
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={useVenueEquipment} onChange={(event) => setUseVenueEquipment(event.target.checked)} />Use my venue&apos;s current in-house equipment for technical matching</label>
      {!useVenueEquipment && <fieldset><legend className="mb-3 text-sm font-medium">Equipment at this event / external venue</legend><div className="grid gap-2 sm:grid-cols-2">{catalog.map((item) => {
        const selected = equipment.find((entry) => entry.equipmentId === item.id);
        return <div key={item.id} className="flex items-center gap-3 rounded-xl border border-line p-3"><label className="flex flex-1 items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(selected)} onChange={(event) => setEquipment((previous) => event.target.checked ? [...previous, { equipmentId: item.id, quantity: 1 }] : previous.filter((entry) => entry.equipmentId !== item.id))} />{item.name}</label>{selected && <Input aria-label={`${item.name} quantity`} type="number" min={1} max={50} className="w-16" value={selected.quantity} onChange={(event) => setEquipment((previous) => previous.map((entry) => entry.equipmentId === item.id ? { ...entry, quantity: Number(event.target.value) } : entry))} />}</div>;
      })}</div><p className="mt-3 text-xs text-muted">An empty list explicitly means no equipment is provided.</p></fieldset>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" value="draft" variant="outline" disabled={busy}>Save draft</Button><Button type="submit" value="published" disabled={busy}>{busy ? "Saving…" : "Save & publish"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button></div>
    </form>
  </CardContent></Card>;
}
