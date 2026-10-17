import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cancelReservedCall } from "@/lib/open-call-payments";
import { getLogger } from "@/lib/logger";

const log = getLogger("open-call-payment-expiry");
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ success: false }, { status: 401 });
  const due = await prisma.booking.findMany({ where: { source: "job_application", status: { in: ["pending", "cancelled"] }, paymentStatus: "pending", responseDeadline: { lte: new Date() } }, include: { jobApplication: { select: { paymentAttempt: true } } }, take: 100 });
  let expired = 0;
  for (const booking of due) {
    try { await cancelReservedCall(booking.jobApplicationId!, booking.venueId, { paymentAttempt: booking.jobApplication!.paymentAttempt, onlyIfExpired: true }); expired++; }
    catch (error) { log.error({ err: error, bookingId: booking.id }, "Could not reconcile expired open-call payment"); }
  }
  return NextResponse.json({ success: true, expired });
}
