import { calendarDate } from "@/lib/discovery-utils";

const DAY_MS = 86400000;

export function eventInstants(date: string, startTime: string, endTime: string, timeZone: string) {
  calendarDate.parse(date);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  function parts(instant: number) {
    const values = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
  }
  function resolve(day: string, time: string) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Use valid start and end times.");
    const wall = `${day}T${time}`;
    const naive = Date.parse(`${wall}:00Z`);
    const candidates = new Set<number>();
    for (let hours = -36; hours <= 36; hours += 6) {
      const sample = naive + hours * 3600000;
      const offset = Date.parse(`${parts(sample)}:00Z`) - sample;
      const candidate = naive - offset;
      if (parts(candidate) === wall) candidates.add(candidate);
    }
    if (candidates.size !== 1) throw new Error("This time is ambiguous or missing due to daylight saving. Choose another time.");
    return new Date([...candidates][0]);
  }
  const nextDay = new Date(Date.parse(date) + DAY_MS).toISOString().slice(0, 10);
  return {
    eventStartsAt: resolve(date, startTime),
    eventEndsAt: resolve(endTime <= startTime ? nextDay : date, endTime),
  };
}

export function isCallOpen(listing: { status: string; applicationDeadline: Date | null; eventStartsAt?: Date | null }, now = new Date()) {
  return listing.status === "published"
    && (!listing.applicationDeadline || listing.applicationDeadline > now)
    && (!listing.eventStartsAt || listing.eventStartsAt > now);
}

export function effectiveBudget(slot: { budgetMin: number | null; budgetMax: number | null } | null, listing: { budgetMin: number; budgetMax: number }) {
  return { budgetMin: slot?.budgetMin ?? listing.budgetMin, budgetMax: slot?.budgetMax ?? listing.budgetMax };
}
