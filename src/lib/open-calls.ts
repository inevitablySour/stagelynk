import { prisma } from "@/lib/db";
import { isCallOpen } from "@/lib/open-call-utils";
import { getListingTechnicalGaps } from "@/lib/technical-gap";
import { scoreApplication } from "@/lib/application-fit";
import type { Prisma } from "@prisma/client";

export const openCallInclude = {
  venue: { select: { venueName: true } },
  _count: { select: { applications: true } },
  slots: { orderBy: { order: "asc" as const } },
} satisfies Prisma.JobListingInclude;

export function serializeCall(listing: Prisma.JobListingGetPayload<{ include: typeof openCallInclude }>) {
  return {
    id: listing.id, title: listing.title, description: listing.description,
    venueName: listing.venue.venueName, externalVenueName: listing.externalVenueName,
    eventType: listing.eventType, location: listing.location, venueAddress: listing.venueAddress,
    eventDate: listing.eventDate?.toISOString().slice(0, 10) ?? null,
    startTime: listing.startTime, endTime: listing.endTime, timeZone: listing.timeZone,
    applicationDeadline: listing.applicationDeadline?.toISOString() ?? null,
    budgetMin: listing.budgetMin, budgetMax: listing.budgetMax, currency: listing.currency,
    genres: Array.isArray(listing.genres) ? listing.genres as string[] : [],
    stageSpecs: listing.stageSpecs, useVenueEquipment: listing.useVenueEquipment,
    eventEquipment: Array.isArray(listing.eventEquipment) ? listing.eventEquipment as { equipmentId: string; quantity: number }[] : [],
    requiredServices: Array.isArray(listing.requiredServices) ? listing.requiredServices as string[] : [],
    equipmentProvided: Array.isArray(listing.equipmentProvided) ? listing.equipmentProvided as string[] : [],
    applicantCount: listing._count.applications, isPromoted: listing.isPromoted, status: listing.status,
    slots: listing.slots.map((slot) => ({
      id: slot.id, label: slot.label, filled: slot.filled, reserved: Boolean(slot.reservedByApplicationId) && !slot.filled,
      budgetMin: slot.budgetMin, budgetMax: slot.budgetMax,
    })),
  };
}
export type OpenCallRow = ReturnType<typeof serializeCall>;

export async function listOpenCalls(filters: { q?: string; genre?: string; subgenre?: string; minBudget?: number; maxBudget?: number; technicalFit?: boolean } = {}, musicianId?: string) {
  const listings = await prisma.jobListing.findMany({
    where: {
      status: "published", venue: { user: { deletedAt: null } },
      ...(filters.q ? { OR: [{ title: { contains: filters.q, mode: "insensitive" } }, { location: { contains: filters.q, mode: "insensitive" } }] } : {}),
    },
    include: openCallInclude,
    orderBy: [{ isPromoted: "desc" }, { createdAt: "desc" }],
  });
  const artist = musicianId ? await prisma.musicianProfile.findFirst({
    where: { id: musicianId, user: { deletedAt: null } }, include: { genres: { include: { genre: true } } },
  }) : null;
  const calls = await Promise.all(listings.filter((listing) => isCallOpen(listing) && listing.eventStartsAt && listing.eventEndsAt).map(async (listing) => {
    const call = serializeCall(listing);
    const gaps = artist ? await getListingTechnicalGaps(artist.id, listing) : undefined;
    const fit = artist ? await scoreApplication({
      musicianId: artist.id, venueId: listing.venueId, listingGenreSlugs: call.genres,
      artistGenreSlugs: [...artist.genres.map((genre) => genre.genre.slug), ...artist.subgenres],
      proposedFee: artist.performanceFee, budgetMin: call.budgetMin, budgetMax: call.budgetMax, technicalGaps: gaps,
    }) : undefined;
    return { ...call, technicalGaps: gaps, fit };
  }));
  return calls.filter((call) =>
    call.slots.some((slot) => !slot.filled && !slot.reserved
      && (filters.minBudget === undefined || (slot.budgetMax ?? call.budgetMax) >= filters.minBudget)
      && (filters.maxBudget === undefined || (slot.budgetMin ?? call.budgetMin) <= filters.maxBudget))
    && (!filters.genre || call.genres.includes(filters.genre))
    && (!filters.subgenre || call.genres.some((tag) => tag.toLocaleLowerCase().replaceAll("-", " ").includes(filters.subgenre!.toLocaleLowerCase().replaceAll("-", " "))))
    && (!filters.technicalFit || call.technicalGaps?.length === 0));
}
