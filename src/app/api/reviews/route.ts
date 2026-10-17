import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reviewSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "venue") {
    const reviews = await prisma.review.findMany({
      where: { reviewerId: session.user.id },
      include: { musician: { select: { stageName: true } }, booking: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: reviews });
  }

  if (session.user.role === "musician") {
    const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
    if (!musician) return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });

    const reviews = await prisma.review.findMany({
      where: { musicianId: musician.id },
      include: {
        reviewer: { include: { venueProfile: { select: { venueName: true } } } },
        booking: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: reviews });
  }

  return NextResponse.json({ success: true, data: [] });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!venue) {
    return NextResponse.json({ success: false, message: "Venue profile not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid review", errors: parsed.error.flatten() }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { review: true },
  });

  if (!booking || booking.venueId !== venue.id) {
    return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  }

  if (booking.status !== "completed") {
    return NextResponse.json({ success: false, message: "You can only review completed bookings" }, { status: 400 });
  }

  if (booking.review) {
    return NextResponse.json({ success: false, message: "This booking already has a review" }, { status: 400 });
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        bookingId: booking.id,
        reviewerId: session.user.id,
        musicianId: booking.musicianId,
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? "",
      },
    });

    const aggregate = await tx.review.aggregate({
      where: { musicianId: booking.musicianId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.musicianProfile.update({
      where: { id: booking.musicianId },
      data: {
        rating: aggregate._avg.rating ?? 0,
        reviewCount: aggregate._count.rating,
      },
    });

    return created;
  });

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "review_create",
    category: "booking",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "Review",
    targetId: review.id,
  });

  return NextResponse.json({ success: true, data: review }, { status: 201 });
}
