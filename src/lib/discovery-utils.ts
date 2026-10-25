import { z } from "zod/v4";

export function normalizeTags(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
  "Use a valid calendar date"
);

export const discoveryQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  instrument: z.string().trim().max(60).default(""),
  genre: z.array(z.string().max(80)).max(30).default([]),
  category: z.array(z.string().max(80)).max(20).default([]),
  minRating: z.coerce.number().min(0).max(10).optional(),
  experienceMin: z.coerce.number().int().min(0).max(100).optional(),
  maxFee: z.coerce.number().min(0).max(1000000).optional(),
  minFee: z.coerce.number().min(0).max(1000000).optional(),
  feeBasis: z.enum(["performance", "hourly", "day"]).optional(),
  hasCredentials: z.enum(["true", "false"]).optional(),
  credentialType: z.enum(["degree", "certificate", "license", "award"]).optional(),
  availableOn: calendarDate.optional(),
  sortBy: z.enum(["random", "rating", "experience", "name", "newest", "blind_scout"]).default("random"),
  // Keeps a randomized order stable while the visitor refines filters.
  seed: z.coerce.number().int().min(0).max(2147483647).optional(),
});

export function includesTag(values: string[], query: string) {
  const needle = query.toLocaleLowerCase();
  return values.some((value) => value.toLocaleLowerCase().includes(needle));
}

/** Deterministic Fisher-Yates shuffle (mulberry32), so one visit keeps a stable random order. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
