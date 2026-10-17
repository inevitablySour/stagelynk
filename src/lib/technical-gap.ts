import { prisma } from "@/lib/db";
import type { TechnicalGap } from "@/types";

/**
 * Compares an artist's technical rider (equipment they need provided) against
 * a venue's in-house equipment, returning every item the venue can't fully
 * cover. An empty array means the venue can meet the full rider.
 */
export async function getTechnicalGaps(musicianId: string, venueId: string): Promise<TechnicalGap[]> {
  const [needs, offerings] = await Promise.all([
    prisma.musicianEquipmentNeed.findMany({
      where: { musicianId },
      include: { equipment: true },
    }),
    prisma.venueEquipmentOffering.findMany({
      where: { venueId },
      include: { equipment: true },
    }),
  ]);

  return compareEquipment(needs, offerings);
}

export function compareEquipment(
  needs: { equipmentId: string; quantity: number; equipment: { name: string; category: string } }[],
  offerings: { equipmentId: string; quantity: number }[]
): TechnicalGap[] {
  const offeringByEquipmentId = new Map(offerings.map((offering) => [offering.equipmentId, offering.quantity]));

  const gaps: TechnicalGap[] = [];
  for (const need of needs) {
    const available = offeringByEquipmentId.get(need.equipmentId) ?? 0;
    const shortfall = need.quantity - available;
    if (shortfall > 0) {
      gaps.push({
        equipmentId: need.equipmentId,
        name: need.equipment.name,
        category: need.equipment.category,
        quantityNeeded: need.quantity,
        quantityAvailable: available,
        shortfall,
      });
    }
  }

  return gaps;
}

export async function getListingTechnicalGaps(musicianId: string, listing: { venueId: string; useVenueEquipment: boolean; eventEquipment: unknown }) {
  const needs = await prisma.musicianEquipmentNeed.findMany({ where: { musicianId }, include: { equipment: true } });
  const offerings = listing.useVenueEquipment
    ? await prisma.venueEquipmentOffering.findMany({ where: { venueId: listing.venueId } })
    : Array.isArray(listing.eventEquipment) ? listing.eventEquipment as { equipmentId: string; quantity: number }[] : [];
  return compareEquipment(needs, offerings);
}

/** Formats a list of gaps into the "Missing: 1 Vocal Mic. Artist must supply." style alert text. */
export function formatGapAlert(gaps: TechnicalGap[]): string | null {
  if (gaps.length === 0) return null;
  const parts = gaps.map((g) => `${g.shortfall} ${g.name}${g.shortfall > 1 ? "s" : ""}`);
  return `Missing: ${parts.join(", ")}. Artist must supply.`;
}
