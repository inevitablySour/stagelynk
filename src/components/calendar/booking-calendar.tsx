"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CalendarEvent {
  id: string;
  kind: "booking_event" | "project_due" | "availability" | "listing_deadline";
  date: string;
  title: string;
  subtitle?: string;
  status?: string;
  href?: string;
}

function kindColor(kind: CalendarEvent["kind"]) {
  if (kind === "booking_event") return "bg-brand";
  if (kind === "project_due") return "bg-copper-500";
  if (kind === "availability") return "bg-emerald-500";
  return "bg-stone-400";
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function BookingCalendar({ role }: { role: "musician" | "venue" }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [quickCreateDate, setQuickCreateDate] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDescription, setQuickDescription] = useState("");
  const [quickBudgetMin, setQuickBudgetMin] = useState("");
  const [quickBudgetMax, setQuickBudgetMax] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const monthStart = useMemo(() => new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1)), [cursor]);
  const monthEnd = useMemo(() => new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)), [cursor]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    const from = toISODate(monthStart);
    const to = toISODate(monthEnd);
    fetch(`/api/calendar?from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) setEvents(json.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [monthStart, monthEnd]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const firstWeekday = monthStart.getUTCDay();
    const totalDays = monthEnd.getUTCDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      cells.push(toISODate(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), d))));
    }
    return cells;
  }, [monthStart, monthEnd, cursor]);

  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthStart);

  const submitQuickCreate = async () => {
    if (!quickCreateDate) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/venues/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickTitle.trim(),
          description: quickDescription.trim(),
          deadline: new Date(`${quickCreateDate}T00:00:00.000Z`).toISOString(),
          budgetMin: quickBudgetMin ? Number(quickBudgetMin) : undefined,
          budgetMax: quickBudgetMax ? Number(quickBudgetMax) : undefined,
          status: "draft",
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setCreateError(json.message ?? "Unable to create listing.");
        return;
      }
      setQuickCreateDate(null);
      setQuickTitle("");
      setQuickDescription("");
      setQuickBudgetMin("");
      setQuickBudgetMax("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">{monthLabel}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() - 1, 1)))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1)))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Event booking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-copper-500" /> Project due
        </span>
        {role === "musician" && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available
          </span>
        )}
        {role === "venue" && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-stone-400" /> Application deadline
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-400">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const dayEvents = eventsByDate.get(date) ?? [];
          const dayNum = Number(date.slice(8, 10));
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDate(date)}
              className={`min-h-20 rounded-lg border p-1.5 text-left transition-colors ${
                selectedDate === date ? "border-brand bg-brand-soft" : "border-stone-100 hover:bg-stone-50"
              }`}
            >
              <span className="text-xs text-stone-500">{dayNum}</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${kindColor(e.kind)}`} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {loading && <p className="text-sm text-stone-500">Loading…</p>}

      {selectedDate && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-stone-900">{new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString()}</h3>
              {role === "venue" && (
                <Button size="sm" variant="outline" onClick={() => setQuickCreateDate(selectedDate)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Quick project
                </Button>
              )}
            </div>

            {(eventsByDate.get(selectedDate) ?? []).length === 0 && <p className="text-sm text-stone-500">Nothing scheduled.</p>}

            {(eventsByDate.get(selectedDate) ?? []).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-2.5">
                <div>
                  <p className="text-sm font-medium text-stone-900">{e.title}</p>
                  {e.subtitle && <p className="text-xs text-stone-500">{e.subtitle}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {e.status && <Badge variant="secondary">{e.status}</Badge>}
                  {e.href && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={e.href}>Manage</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {quickCreateDate === selectedDate && (
              <div className="space-y-2 border-t border-stone-100 pt-3">
                <Input placeholder="Project title" value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} />
                <textarea
                  className="min-h-16 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
                  placeholder="Description (20+ characters)"
                  value={quickDescription}
                  onChange={(e) => setQuickDescription(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Budget min" value={quickBudgetMin} onChange={(e) => setQuickBudgetMin(e.target.value)} />
                  <Input type="number" placeholder="Budget max" value={quickBudgetMax} onChange={(e) => setQuickBudgetMax(e.target.value)} />
                </div>
                {createError && <p className="text-sm text-red-600">{createError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setQuickCreateDate(null)} disabled={creating}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={submitQuickCreate} disabled={creating || quickTitle.trim().length < 4 || quickDescription.trim().length < 20}>
                    {creating ? "Creating…" : "Create as draft"}
                  </Button>
                </div>
                <p className="text-xs text-stone-400">
                  Saved as a draft with this date as the deadline — finish and publish it from Project Listings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
