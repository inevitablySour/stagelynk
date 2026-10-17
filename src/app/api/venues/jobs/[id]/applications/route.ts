import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreApplication } from "@/lib/application-fit";
import { dailyRotationSeed } from "@/lib/blind-scout";
import { getListingTechnicalGaps } from "@/lib/technical-gap";
import { effectiveBudget } from "@/lib/open-call-utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobListingId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!venue) {
    return NextResponse.json({ success: false, message: "Venue profile not found" }, { status: 404 });
  }

  const listing = await prisma.jobListing.findUnique({ where: { id: jobListingId } });
  if (!listing || listing.venueId !== venue.id) {
    return NextResponse.json({ success: false, message: "Job listing not found" }, { status: 404 });
  }

  const applications = await prisma.jobApplication.findMany({
    where: { jobListingId, musician: { user: { deletedAt: null } } },
    include: {
      musician: { include: { genres: { include: { genre: true } } } },
      slot: true,
      booking: { select: { paymentStatus: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const listingGenreSlugs = Array.isArray(listing.genres) ? (listing.genres as string[]) : [];

  const scored = await Promise.all(
    applications.map(async (a) => {
      const artistGenreSlugs = [...a.musician.genres.map((mg) => mg.genre.slug), ...a.musician.subgenres];
      const technicalGaps = await getListingTechnicalGaps(a.musicianId, listing);
      const budget = effectiveBudget(a.slot, listing);
      const fit = await scoreApplication({
        musicianId: a.musician.id,
        venueId: venue.id,
        listingGenreSlugs,
        artistGenreSlugs,
        proposedFee: a.proposedFee ?? a.musician.performanceFee,
        ...budget,
        technicalGaps,
      });

      return {
        id: a.id,
        jobListingId: a.jobListingId,
        coverMessage: a.coverMessage,
        proposedFee: a.proposedFee,
        availabilityNotes: a.availabilityNotes,
        availabilityConfirmed: a.availabilityConfirmed,
        technicalGaps,
        booking: a.booking,
        agreedFee: a.proposedFee ?? budget.budgetMin,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        slot: a.slot ? { id: a.slot.id, label: a.slot.label } : null,
        musician: {
          id: a.musician.id,
          stageName: a.musician.stageName,
          location: a.musician.location,
          rating: a.musician.rating,
          reviewCount: a.musician.reviewCount,
          experienceYears: a.musician.experienceYears,
          genres: a.musician.genres.map((mg) => mg.genre.name),
        },
        fit,
      };
    })
  );

  // Rotation-based tie-break (not createdAt) so applicants with identical
  // fit scores aren't always ordered by who applied most recently — part of
  // the spec's "open rotation model" for equitable visibility.
  scored.sort((a, b) => {
    if (a.fit.overall !== b.fit.overall) return b.fit.overall - a.fit.overall;
    return dailyRotationSeed(a.id) - dailyRotationSeed(b.id);
  });

  return NextResponse.json({ success: true, data: scored });
}
