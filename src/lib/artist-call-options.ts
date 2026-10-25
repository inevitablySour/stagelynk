import type { ArtistCallDealType } from "@prisma/client";
import { CATEGORY_GROUPS, GENRE_GROUPS } from "@/config";

/** Client-safe: no database imports. */
export const DEAL_TYPE_LABELS: Record<ArtistCallDealType, string> = {
  rate: "Day / hourly rate",
  milestone: "Milestone fee",
  split_credit: "50/50 split & credit",
};

export const ROLE_OPTIONS = CATEGORY_GROUPS.flatMap((g) => g.subcategories.map((s) => ({ slug: s.slug, name: s.name, group: g.name })));
export const GENRE_OPTIONS = GENRE_GROUPS.flatMap((g) => g.subgenres.map((s) => ({ slug: s.slug, name: s.name, group: g.name })));

export const roleName = (slug: string) => ROLE_OPTIONS.find((r) => r.slug === slug)?.name ?? slug;
export const genreName = (slug: string) => GENRE_OPTIONS.find((g) => g.slug === slug)?.name ?? slug;

