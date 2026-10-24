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
  sortBy: z.enum(["rating", "experience", "name", "newest", "blind_scout"]).default("rating"),
});

export function includesTag(values: string[], query: string) {
  const needle = query.toLocaleLowerCase();
  return values.some((value) => value.toLocaleLowerCase().includes(needle));
}
