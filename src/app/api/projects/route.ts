import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod/v4";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = z.object({
    q: z.string().trim().max(120).optional(),
    genre: z.string().max(80).optional(),
  }).safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid project filters" }, { status: 400 });

  const listings = await prisma.projectListing.findMany({
    where: {
      status: "published",
      venue: { user: { deletedAt: null } },
      ...(parsed.data.q
        ? { OR: [{ title: { contains: parsed.data.q, mode: "insensitive" } }, { description: { contains: parsed.data.q, mode: "insensitive" } }] }
        : {}),
    },
    include: { venue: { select: { venueName: true } }, _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  const data = listings
    .map((listing) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      venueName: listing.venue.venueName,
      deadline: listing.deadline?.toISOString() ?? null,
      budgetMin: listing.hideBudget ? 0 : listing.budgetMin,
      budgetMax: listing.hideBudget ? 0 : listing.budgetMax,
      hideBudget: listing.hideBudget,
      currency: listing.currency,
      genres: Array.isArray(listing.genres) ? (listing.genres as string[]) : [],
      requiredServices: Array.isArray(listing.requiredServices) ? (listing.requiredServices as string[]) : [],
      applicantCount: listing._count.applications,
    }))
    .filter((p) => !parsed.data.genre || p.genres.includes(parsed.data.genre));

  return NextResponse.json({ success: true, data });
}
