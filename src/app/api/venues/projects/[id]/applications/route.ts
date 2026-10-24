import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!venue) {
    return NextResponse.json({ success: false, message: "Venue profile not found" }, { status: 404 });
  }

  const { id: projectListingId } = await params;
  const listing = await prisma.projectListing.findUnique({ where: { id: projectListingId } });
  if (!listing || listing.venueId !== venue.id) {
    return NextResponse.json({ success: false, message: "Project listing not found" }, { status: 404 });
  }

  const applications = await prisma.projectApplication.findMany({
    where: { projectListingId, musician: { user: { deletedAt: null } } },
    include: { musician: { select: { id: true, stageName: true, location: true, rating: true, reviewCount: true } }, booking: { select: { paymentStatus: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: applications });
}
