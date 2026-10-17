import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";
import { releasePayoutForBooking, PayoutReleaseError } from "@/lib/payout-release";

const log = getLogger("cron-payout-release");

/**
 * Auto-releases payouts 24 hours after a booking's scheduled end time,
 * unless an open dispute exists on the booking. Triggered hourly via Vercel
 * Cron (see vercel.json).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const dueBookings = await prisma.booking.findMany({
    where: {
      status: "completed",
      payoutStatus: "pending",
      payoutReleaseAt: { lte: new Date() },
    },
    include: {
      musician: { include: { user: { select: { email: true } } } },
      venue: { select: { venueName: true } },
      disputes: { where: { status: { notIn: ["resolved_refund_full", "resolved_refund_partial", "resolved_no_refund"] } } },
    },
  });

  let releasedCount = 0;
  let skippedForDisputeCount = 0;

  for (const booking of dueBookings) {
    if (booking.disputes.length > 0) {
      skippedForDisputeCount++;
      continue;
    }

    try {
      await releasePayoutForBooking(booking, { event: "payout_released_auto" });
      releasedCount++;
    } catch (error) {
      if (error instanceof PayoutReleaseError) {
        log.warn({ bookingId: booking.id, reason: error.message }, "Skipped auto-release");
        continue;
      }
      log.error({ err: error, bookingId: booking.id }, "Failed to auto-release payout");
    }
  }

  return NextResponse.json({ success: true, releasedCount, skippedForDisputeCount });
}
