import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";
import { sendDisputeFiledEmail } from "@/lib/email-templates";
import type { DisputeStatus } from "@prisma/client";

const log = getLogger("api-bookings-disputes");
const RESPONSE_WINDOW_MS = 72 * 60 * 60 * 1000;

const OPEN_STATUSES: DisputeStatus[] = ["pending_response", "accepted", "declined", "auto_resolved", "escalated"];

const fileDisputeSchema = z.object({
  kind: z.enum(["cancellation", "refund_request"]),
  timing: z.enum(["pre_event", "post_event"]),
  reason: z.string().trim().min(10, "Describe the issue in at least 10 characters").max(3000),
  requestedRefundAmount: z.number().min(0).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const parsed = fileDisputeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid dispute", errors: parsed.error.flatten() }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      musician: { select: { stageName: true, user: { select: { email: true } } } },
      venue: { select: { venueName: true, user: { select: { email: true } } } },
    },
  });
  if (!booking) {
    return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  }

  let initiatedBy: "musician" | "venue" | null = null;
  if (session.user.role === "musician") {
    const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
    if (musician?.id === booking.musicianId) initiatedBy = "musician";
  } else if (session.user.role === "venue") {
    const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
    if (venue?.id === booking.venueId) initiatedBy = "venue";
  }
  if (!initiatedBy) {
    return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  }

  if (booking.status !== "accepted" && booking.status !== "completed") {
    return NextResponse.json({ success: false, message: "Only accepted or completed bookings can be disputed." }, { status: 400 });
  }
  const hasPayment = booking.paymentStatus === "paid"
    || (booking.paymentStructure === "milestone" && await prisma.marketplaceTransaction.count({ where: { bookingId: id, status: "paid" } }) > 0);
  if (!hasPayment) {
    return NextResponse.json({ success: false, message: "This booking has no payment to dispute." }, { status: 400 });
  }

  const existingOpen = await prisma.bookingDispute.findFirst({
    where: { bookingId: id, status: { in: OPEN_STATUSES } },
  });
  if (existingOpen) {
    return NextResponse.json({ success: false, message: "There is already an open dispute on this booking." }, { status: 409 });
  }

  const { kind, timing, reason, requestedRefundAmount } = parsed.data;
  const responseDeadline = new Date(Date.now() + RESPONSE_WINDOW_MS);

  const dispute = await prisma.bookingDispute.create({
    data: {
      bookingId: id,
      kind,
      timing,
      initiatedBy,
      initiatorUserId: session.user.id,
      reason,
      requestedRefundAmount,
      responseDeadline,
    },
  });

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "dispute_filed",
    category: "booking",
    level: "warn",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "BookingDispute",
    targetId: dispute.id,
    metadata: { bookingId: id, kind, timing },
  });

  const notifyEmail = initiatedBy === "musician" ? booking.venue.user.email : booking.musician.user.email;
  const notifyName = initiatedBy === "musician" ? booking.venue.venueName : booking.musician.stageName;
  const otherPartyName = initiatedBy === "musician" ? booking.musician.stageName : booking.venue.venueName;
  if (notifyEmail) {
    sendDisputeFiledEmail(
      { email: notifyEmail, name: notifyName },
      { otherPartyName, bookingTitle: booking.title, reason, responseDeadline }
    ).catch((err) => log.error({ err }, "Failed to send dispute filed email"));
  }

  return NextResponse.json({ success: true, data: dispute });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  }

  let isParty = session.user.role === "admin";
  if (session.user.role === "musician") {
    const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
    isParty = musician?.id === booking.musicianId;
  } else if (session.user.role === "venue") {
    const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
    isParty = venue?.id === booking.venueId;
  }
  if (!isParty) {
    return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
  }

  const disputes = await prisma.bookingDispute.findMany({ where: { bookingId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ success: true, data: disputes });
}
