import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";
import { releasePayoutForBooking, PayoutReleaseError } from "@/lib/payout-release";

const log = getLogger("api-bookings-release-payout");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { musician: { include: { user: { select: { email: true } } } }, venue: { select: { venueName: true } } },
  });
  if (!booking) {
    return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  }

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!venue || venue.id !== booking.venueId) {
    return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  }

  try {
    const transfer = await releasePayoutForBooking(booking, {
      event: "payout_released_early",
      actorUserId: session.user.id,
    });
    return NextResponse.json({ success: true, data: { transferId: transfer.id } });
  } catch (error) {
    if (error instanceof PayoutReleaseError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    log.error({ err: error, bookingId: id }, "Failed to release payout");
    return NextResponse.json({ success: false, message: "Unable to release payout right now." }, { status: 500 });
  }
}
