import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";
import { releaseHold } from "@/lib/booking-escrow";
import { writeAuditLog } from "@/lib/audit-log";
import { sendBookingCancelledEmail } from "@/lib/email-templates";

const log = getLogger("cron-booking-expiry");

/**
 * Stripe has no native way to auto-cancel a manual-capture hold after a
 * custom short window (only its own ~7-day network ceiling) — this job is
 * the actual 48-hour expiry mechanism for Direct Hire negotiations. Intended
 * Triggered every 15 minutes via Vercel Cron (see vercel.json), which calls
 * scheduled routes with GET and an `authorization: Bearer $CRON_SECRET`
 * header automatically. See .claude/skills/stripe-connect/SKILL.md.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const expiredBookings = await prisma.booking.findMany({
    where: {
      source: "direct_request",
      negotiationStatus: { in: ["pending_response", "counter_pending"] },
      responseDeadline: { lte: new Date() },
    },
    include: {
      musician: { select: { stageName: true, user: { select: { email: true } } } },
      venue: { select: { venueName: true, user: { select: { email: true } } } },
    },
  });

  let expiredCount = 0;
  for (const booking of expiredBookings) {
    try {
      if (booking.stripePaymentIntentId) {
        await releaseHold(booking.stripePaymentIntentId);
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "declined", negotiationStatus: "expired", paymentStatus: "cancelled" },
      });

      await writeAuditLog({
        event: "booking_negotiation_expired",
        category: "booking",
        level: "info",
        targetType: "Booking",
        targetId: booking.id,
      });

      if (booking.venue.user.email) {
        sendBookingCancelledEmail(
          { email: booking.venue.user.email, name: booking.venue.venueName },
          { otherPartyName: booking.musician.stageName, eventDate: booking.eventDate }
        ).catch((err) => log.error({ err }, "Failed to send expiry notification email"));
      }

      expiredCount++;
    } catch (error) {
      log.error({ err: error, bookingId: booking.id }, "Failed to expire booking negotiation");
    }
  }

  return NextResponse.json({ success: true, expiredCount });
}
