import { prisma } from "@/lib/db";
import { serializeMusicianProfile } from "@/lib/serializers";
import { rankBlindScout } from "@/lib/blind-scout";
import { discoveryQuerySchema, includesTag } from "@/lib/discovery-utils";
import { withinLeeway } from "@/lib/rate-leeway";
import type { z } from "zod/v4";

export async function discoverArtists(filters: z.infer<typeof discoveryQuerySchema>) {
  const profiles = await prisma.musicianProfile.findMany({
    where: {
      user: { deletedAt: null },
      ...(filters.location ? { location: { contains: filters.location, mode: "insensitive" as const } } : {}),
      ...(filters.experienceMin !== undefined ? { experienceYears: { gte: filters.experienceMin } } : {}),
      ...(filters.hasCredentials === "true" ? { credentials: { some: {} } } : {}),
      ...(filters.credentialType ? { credentials: { some: { type: filters.credentialType } } } : {}),
    },
    include: {
      mainGenreGroup: true,
      genrePicks: { include: { subtype: true } },
      categoryPicks: { include: { subtype: { include: { group: true } }, instrumentType: true } },
      services: { include: { service: true } },
      albums: { include: { tracks: true } },
      credentials: true,
      availabilitySlots: true,
      bookings: {
        where: { OR: [{ status: { in: ["accepted", "completed"] } }, { status: "pending", source: "job_application", paymentStatus: { in: ["pending", "authorized"] } }] },
        select: {
          eventDate: true, startTime: true, endTime: true,
          jobApplication: { select: { jobListing: { select: { eventStartsAt: true, eventEndsAt: true } } } },
        },
      },
    },
  });

  const results = profiles.filter((profile) => {
    const categorySlugs = profile.categoryPicks.map((p) => p.subtype.slug);
    if (filters.category.length && !filters.category.some((c) => categorySlugs.includes(c))) return false;
    if (filters.instrument && !includesTag(profile.instruments, filters.instrument)) return false;

    const genreSlugs = profile.genrePicks.map((p) => p.subtype.slug);
    const customGenreLabels = profile.genrePicks.map((p) => p.customLabel).filter((v): v is string => Boolean(v));
    if (filters.q && !includesTag([profile.stageName, profile.location, ...profile.instruments, ...customGenreLabels], filters.q)) return false;
    if (filters.genre.length && !filters.genre.some((genre) => genreSlugs.includes(genre) || includesTag(customGenreLabels, genre))) return false;

    if (filters.availableOn) {
      const day = Date.parse(filters.availableOn);
      const nextDay = day + 86400000;
      if (!profile.availabilitySlots.some((slot) =>
        slot.startDate.toISOString().slice(0, 10) <= filters.availableOn! && slot.endDate.toISOString().slice(0, 10) >= filters.availableOn!)) return false;
      if (profile.bookings.some((booking) => {
        const listing = booking.jobApplication?.jobListing;
        const start = listing?.eventStartsAt?.getTime() ?? Date.parse(`${booking.eventDate.toISOString().slice(0, 10)}T${booking.startTime}:00Z`);
        let end = listing?.eventEndsAt?.getTime() ?? Date.parse(`${booking.eventDate.toISOString().slice(0, 10)}T${booking.endTime}:00Z`);
        if (end <= start) end += 86400000;
        return start < nextDay && end > day;
      })) return false;
    }
    return true;
  }).map(serializeMusicianProfile).filter((artist) =>
    filters.sortBy === "blind_scout" || filters.minRating === undefined || artist.weightedRating >= filters.minRating);

  const withRateInfo = applyRateFilter(results, filters.minFee, filters.maxFee, filters.feeBasis);

  if (filters.sortBy === "blind_scout") return rankBlindScout(withRateInfo, filters.genre);
  return withRateInfo.sort((a, b) => {
    if (filters.sortBy === "name") return a.stageName.localeCompare(b.stageName);
    if (filters.sortBy === "experience") return b.experienceYears - a.experienceYears;
    if (filters.sortBy === "newest") return b.createdAt.localeCompare(a.createdAt);
    return b.weightedRating - a.weightedRating || a.stageName.localeCompare(b.stageName);
  });
}

type Serialized = ReturnType<typeof serializeMusicianProfile>;

/**
 * Applies a tiered-leeway budget filter when the venue has specified a
 * min/max fee. Checks whichever of performance/hourly/day fee the venue
 * indicated (`feeBasis`), falling back to checking any fee the artist has
 * quoted so an artist who only set an hourlyFee isn't invisible to a
 * flat-budget search. Attaches `rateMatch` (delta info) to each surviving
 * result so the UI can show "10% above your budget" rather than silently
 * widening results.
 */
function applyRateFilter<T extends Serialized>(
  artists: T[],
  minFee: number | undefined,
  maxFee: number | undefined,
  feeBasis: "performance" | "hourly" | "day" | undefined
): (T & { rateMatch?: { deltaPercent: number; direction: "above" | "below" } })[] {
  if (minFee === undefined && maxFee === undefined) return artists;
  const min = minFee ?? 0;
  const max = maxFee ?? Infinity;

  const feeFor = (artist: Serialized) => {
    if (feeBasis === "performance") return artist.performanceFee;
    if (feeBasis === "hourly") return artist.hourlyFee;
    if (feeBasis === "day") return artist.dayFee;
    return artist.performanceFee ?? artist.hourlyFee ?? artist.dayFee;
  };

  const out: (T & { rateMatch?: { deltaPercent: number; direction: "above" | "below" } })[] = [];
  for (const artist of artists) {
    const fee = feeFor(artist);
    if (fee == null) {
      out.push(artist);
      continue;
    }
    const result = withinLeeway(fee, min, Number.isFinite(max) ? max : fee);
    if (!result.inRange) continue;
    if (result.deltaPercent !== null && result.direction) {
      out.push({ ...artist, rateMatch: { deltaPercent: result.deltaPercent, direction: result.direction } });
    } else {
      out.push(artist);
    }
  }
  return out;
}
