import { prisma } from "@/lib/db";
import { serializeMusicianProfile } from "@/lib/serializers";
import { rankBlindScout } from "@/lib/blind-scout";
import { discoveryQuerySchema, includesTag, normalizeCategory } from "@/lib/discovery-utils";
import type { z } from "zod/v4";

export async function discoverArtists(filters: z.infer<typeof discoveryQuerySchema>) {
  const profiles = await prisma.musicianProfile.findMany({
    where: {
      user: { deletedAt: null },
      ...(filters.location ? { location: { contains: filters.location, mode: "insensitive" as const } } : {}),
      ...(filters.experienceMin !== undefined ? { experienceYears: { gte: filters.experienceMin } } : {}),
      ...(filters.hasCredentials === "true" ? { credentials: { some: {} } } : {}),
      ...(filters.credentialType ? { credentials: { some: { type: filters.credentialType } } } : {}),
      ...(filters.maxFee !== undefined ? { performanceFee: { lte: filters.maxFee } } : {}),
    },
    include: {
      genres: { include: { genre: true } },
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
  const selectedCategories = filters.category.map((value) => normalizeCategory(value) ?? value);
  const results = profiles.filter((profile) => {
    if (selectedCategories.length && !selectedCategories.includes(normalizeCategory(profile.primaryCategory) ?? profile.primaryCategory)) return false;
    if (filters.instrument && !includesTag(profile.instruments, filters.instrument)) return false;
    if (filters.subgenre && !includesTag(profile.subgenres, filters.subgenre)) return false;
    if (filters.q && !includesTag([profile.stageName, profile.location, ...profile.instruments, ...profile.subgenres], filters.q)) return false;
    if (filters.genre.length && !filters.genre.some((genre) =>
      profile.genres.some((entry) => entry.genre.slug === genre) || includesTag(profile.subgenres, genre))) return false;
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
  if (filters.sortBy === "blind_scout") return rankBlindScout(results, filters.genre);
  return results.sort((a, b) => {
    if (filters.sortBy === "name") return a.stageName.localeCompare(b.stageName);
    if (filters.sortBy === "experience") return b.experienceYears - a.experienceYears;
    if (filters.sortBy === "newest") return b.createdAt.localeCompare(a.createdAt);
    return b.weightedRating - a.weightedRating || a.stageName.localeCompare(b.stageName);
  });
}
