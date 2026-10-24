import { getTechnicalGaps } from "@/lib/technical-gap";
import { dailyRotationSeed } from "@/lib/blind-scout";
import type { TechnicalGap } from "@/types";

export interface ApplicationFitScore {
  genreFit: number; // 0-1
  technicalFit: number; // 0-1
  financialFit: number; // 0-1
  overall: number; // 0-1, weighted
}

const WEIGHTS = { genre: 0.35, technical: 0.35, financial: 0.3 };

function computeGenreFit(listingGenreSlugs: string[], artistGenreSlugs: string[]): number {
  if (listingGenreSlugs.length === 0) return 1; // no genre requirement — everyone fits
  const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, "-");
  const artistTags = new Set(artistGenreSlugs.map(normalize));
  const matchCount = listingGenreSlugs.filter((slug) => artistTags.has(normalize(slug))).length;
  return matchCount / listingGenreSlugs.length;
}

function computeFinancialFit(proposedFee: number | null, budgetMin: number, budgetMax: number): number {
  if (proposedFee === null || proposedFee === undefined) return 0.5; // no proposal — neutral
  if (budgetMax <= 0) return 0.5; // no budget set — neutral
  if (proposedFee >= budgetMin && proposedFee <= budgetMax) return 1;
  // Linearly decay fit the further outside the range the proposal falls,
  // relative to the range's own width (or the budget itself if the range is a point).
  const rangeWidth = Math.max(budgetMax - budgetMin, budgetMax * 0.25, 1);
  const distance = proposedFee < budgetMin ? budgetMin - proposedFee : proposedFee - budgetMax;
  return Math.max(0, 1 - distance / rangeWidth);
}

/** Technical fit: fraction of the venue's required services/equipment the artist's rider doesn't conflict with — reuses the Phase 1 gap-alert comparison. 1 = no gaps, scales down with shortfall count. */
async function computeTechnicalFit(musicianId: string, venueId: string): Promise<number> {
  const gaps = await getTechnicalGaps(musicianId, venueId);
  if (gaps.length === 0) return 1;
  // Each gap reduces fit; floor at 0.1 so a technical mismatch alone never
  // fully zeroes out an otherwise-strong applicant (gaps are visible
  // separately via the gap alert, not a hard disqualifier here).
  return Math.max(0.1, 1 - gaps.length * 0.2);
}

export async function scoreApplication(params: {
  musicianId: string;
  venueId: string;
  listingGenreSlugs: string[];
  artistGenreSlugs: string[];
  proposedFee: number | null;
  budgetMin: number;
  budgetMax: number;
  technicalGaps?: TechnicalGap[];
}): Promise<ApplicationFitScore> {
  const genreFit = computeGenreFit(params.listingGenreSlugs, params.artistGenreSlugs);
  const financialFit = computeFinancialFit(params.proposedFee, params.budgetMin, params.budgetMax);
  const technicalFit = params.technicalGaps
    ? Math.max(0.1, 1 - params.technicalGaps.length * 0.2)
    : await computeTechnicalFit(params.musicianId, params.venueId);

  const overall = genreFit * WEIGHTS.genre + technicalFit * WEIGHTS.technical + financialFit * WEIGHTS.financial;

  return { genreFit, technicalFit, financialFit, overall };
}

/**
 * Sorts already-scored applications by sequential tier — equipment/technical
 * fit first, then genre fit, then financial fit — instead of the flat
 * weighted sum `scoreApplication().overall` produces. Each tier still uses
 * the same soft 0-1 scoring (never a hard gate), so one missing mic can't
 * zero out an otherwise strong applicant; it just means equipment fit
 * dominates the sort order the way "tiered" was asked for. Same
 * comparator-chain pattern as rankBlindScout/rankP2PCandidates.
 */
export function rankApplicationsTiered<T extends { id: string; fit: ApplicationFitScore }>(applications: T[]): T[] {
  return [...applications].sort((a, b) => {
    if (a.fit.technicalFit !== b.fit.technicalFit) return b.fit.technicalFit - a.fit.technicalFit;
    if (a.fit.genreFit !== b.fit.genreFit) return b.fit.genreFit - a.fit.genreFit;
    if (a.fit.financialFit !== b.fit.financialFit) return b.fit.financialFit - a.fit.financialFit;
    return dailyRotationSeed(a.id) - dailyRotationSeed(b.id);
  });
}
