import { prisma } from "@/lib/db";
import { compareEquipment } from "@/lib/technical-gap";
import { dailyRotationSeed } from "@/lib/blind-scout";

export interface P2PCandidate {
  musicianId: string;
  genreSlugs: string[];
  answers: Record<string, string | string[] | null> | null;
}

/**
 * Bidirectional equipment fit: what A needs that B owns, and what B needs
 * that A owns — no venue in the loop, unlike the booking/job-application
 * gap check. Soft scoring mirrors computeTechnicalFit in application-fit.ts
 * (floor at 0.1, never a hard disqualifier).
 */
async function computeEquipmentFitTier(musicianAId: string, musicianBId: string): Promise<number> {
  const [aNeeds, aOwned, bNeeds, bOwned] = await Promise.all([
    prisma.musicianEquipmentNeed.findMany({ where: { musicianId: musicianAId }, include: { equipment: true } }),
    prisma.musicianEquipmentOwned.findMany({ where: { musicianId: musicianBId } }),
    prisma.musicianEquipmentNeed.findMany({ where: { musicianId: musicianBId }, include: { equipment: true } }),
    prisma.musicianEquipmentOwned.findMany({ where: { musicianId: musicianAId } }),
  ]);

  const gapsAFromB = compareEquipment(aNeeds, aOwned);
  const gapsBFromA = compareEquipment(bNeeds, bOwned);
  const totalGaps = gapsAFromB.length + gapsBFromA.length;

  if (totalGaps === 0) return 1;
  return Math.max(0.1, 1 - totalGaps * 0.2);
}

/** Symmetric Jaccard-style genre overlap — neither party is "the listing," so it's intersection/union, not one-sided. */
function computeGenreFitTier(genreSlugsA: string[], genreSlugsB: string[]): number {
  const a = new Set(genreSlugsA);
  const b = new Set(genreSlugsB);
  if (a.size === 0 && b.size === 0) return 0.5; // neutral — nobody specified genres
  const intersection = [...a].filter((slug) => b.has(slug)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0.5 : intersection / union;
}

/** Soft compatibility score from overlapping non-null questionnaire answers. */
function computeQuestionnaireFitTier(
  answersA: Record<string, string | string[] | null> | null,
  answersB: Record<string, string | string[] | null> | null
): number {
  if (!answersA || !answersB) return 0.5;
  const keys = new Set([...Object.keys(answersA), ...Object.keys(answersB)]);
  let comparable = 0;
  let matches = 0;

  for (const key of keys) {
    const a = answersA[key];
    const b = answersB[key];
    if (a == null || b == null) continue;
    comparable++;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.some((v) => b.includes(v))) matches++;
    } else if (a === b) {
      matches++;
    }
  }

  if (comparable === 0) return 0.5;
  return Math.max(0.1, matches / comparable);
}

export interface RankedP2PCandidate {
  musicianId: string;
  equipmentFit: number;
  genreFit: number;
  questionnaireFit: number;
}

/**
 * Sequential-tier ranking (equipment -> genre -> questionnaire), same
 * comparator-chain pattern as rankBlindScout — not a weighted sum. No
 * financial-fit parameter exists here at all: P2P never factors money into
 * matching, structurally, not just by convention.
 */
export async function rankP2PCandidates(
  musicianId: string,
  candidates: P2PCandidate[],
  myGenreSlugs: string[],
  myAnswers: Record<string, string | string[] | null> | null
): Promise<RankedP2PCandidate[]> {
  const scored = await Promise.all(
    candidates.map(async (candidate) => ({
      musicianId: candidate.musicianId,
      equipmentFit: await computeEquipmentFitTier(musicianId, candidate.musicianId),
      genreFit: computeGenreFitTier(myGenreSlugs, candidate.genreSlugs),
      questionnaireFit: computeQuestionnaireFitTier(myAnswers, candidate.answers),
    }))
  );

  return scored.sort((a, b) => {
    if (a.equipmentFit !== b.equipmentFit) return b.equipmentFit - a.equipmentFit;
    if (a.genreFit !== b.genreFit) return b.genreFit - a.genreFit;
    if (a.questionnaireFit !== b.questionnaireFit) return b.questionnaireFit - a.questionnaireFit;
    return dailyRotationSeed(a.musicianId) - dailyRotationSeed(b.musicianId);
  });
}
