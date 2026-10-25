import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";
import { refundBookingPayments } from "@/lib/booking-escrow";
import { sendDisputeResolvedEmail } from "@/lib/email-templates";

const log = getLogger("api-bookings-dispute-action");

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("respond-accept") }),
  z.object({ action: z.literal("respond-decline") }),
  z.object({
    action: z.literal("resolve"),
    resolution: z.enum(["resolved_refund_full", "resolved_refund_partial", "resolved_no_refund"]),
    refundAmount: z.number().min(0).optional(),
    resolutionNotes: z.string().trim().min(5).max(3000),
  }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; disputeId: string }> }) {
  const { id, disputeId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid request", errors: parsed.error.flatten() }, { status: 400 });
  }

  const dispute = await prisma.bookingDispute.findUnique({
    where: { id: disputeId },
    include: {
      booking: {
        include: {
          musician: { select: { id: true, stageName: true, user: { select: { email: true } } } },
          venue: { select: { id: true, venueName: true, user: { select: { email: true } } } },
        },
      },
    },
  });
  if (!dispute || dispute.bookingId !== id) {
    return NextResponse.json({ success: false, message: "Dispute not found" }, { status: 404 });
  }

  const { booking } = dispute;
  const requestMetadata = await getRequestMetadata();

  if (parsed.data.action === "resolve") {
    if (session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Only an administrator can resolve a dispute." }, { status: 403 });
    }
    if (dispute.status === "resolved_refund_full" || dispute.status === "resolved_refund_partial" || dispute.status === "resolved_no_refund") {
      return NextResponse.json({ success: false, message: "This dispute has already been resolved." }, { status: 400 });
    }

    const { resolution, refundAmount, resolutionNotes } = parsed.data;

    const charges = await prisma.marketplaceTransaction.findMany({
      where: { bookingId: id, status: { in: ["paid", "partially_refunded"] }, providerPaymentId: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { providerPaymentId: true, totalChargeAmount: true },
    });
    const totalPaid = Math.round(charges.reduce((sum, c) => sum + c.totalChargeAmount, 0) * 100) / 100;
    if ((resolution === "resolved_refund_full" || resolution === "resolved_refund_partial") && charges.length === 0) {
      return NextResponse.json({ success: false, message: "No payment was recorded for this booking." }, { status: 400 });
    }
    if (resolution === "resolved_refund_partial" && (!refundAmount || refundAmount <= 0 || refundAmount >= totalPaid)) {
      return NextResponse.json({ success: false, message: "Provide a partial refund amount less than the total charge." }, { status: 400 });
    }

    let newPaymentStatus = booking.paymentStatus;
    if (resolution === "resolved_refund_full") {
      await refundBookingPayments(charges);
      newPaymentStatus = "refunded";
    } else if (resolution === "resolved_refund_partial") {
      await refundBookingPayments(charges, refundAmount);
      newPaymentStatus = "partially_refunded";
    }

    await prisma.$transaction(async (tx) => {
      await tx.bookingDispute.update({
        where: { id: disputeId },
        data: { status: resolution, resolvedAt: new Date(), resolvedByUserId: session.user.id, resolutionNotes },
      });
      if (newPaymentStatus !== booking.paymentStatus) {
        await tx.booking.update({ where: { id }, data: { paymentStatus: newPaymentStatus } });
      }
    });

    await writeAuditLog({
      event: "dispute_resolved",
      category: "booking",
      level: "info",
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      requestId: requestMetadata.requestId,
      targetType: "BookingDispute",
      targetId: disputeId,
      metadata: { resolution, refundAmount },
    });

    const resolutionLabel = resolution === "resolved_refund_full" ? "Full refund issued"
      : resolution === "resolved_refund_partial" ? "Partial refund issued" : "No refund — resolved in favor of the artist";
    for (const recipient of [
      { email: booking.musician.user.email, name: booking.musician.stageName },
      { email: booking.venue.user.email, name: booking.venue.venueName },
    ]) {
      if (recipient.email) {
        sendDisputeResolvedEmail(
          { email: recipient.email, name: recipient.name },
          { bookingTitle: booking.title, resolution: resolutionLabel, resolutionNotes }
        ).catch((err) => log.error({ err }, "Failed to send dispute resolved email"));
      }
    }

    const updated = await prisma.bookingDispute.findUniqueOrThrow({ where: { id: disputeId } });
    return NextResponse.json({ success: true, data: updated });
  }

  // respond-accept / respond-decline: only the non-initiating party, within the response window.
  let isNonInitiatingParty = false;
  if (session.user.role === "musician") {
    const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
    isNonInitiatingParty = musician?.id === booking.musicianId && dispute.initiatedBy !== "musician";
  } else if (session.user.role === "venue") {
    const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
    isNonInitiatingParty = venue?.id === booking.venueId && dispute.initiatedBy !== "venue";
  }
  if (!isNonInitiatingParty) {
    return NextResponse.json({ success: false, message: "Only the other party can respond to this dispute." }, { status: 403 });
  }
  if (dispute.status !== "pending_response") {
    return NextResponse.json({ success: false, message: "This dispute is no longer awaiting a response." }, { status: 400 });
  }
  if (dispute.responseDeadline && dispute.responseDeadline < new Date()) {
    return NextResponse.json({ success: false, message: "The response window for this dispute has passed." }, { status: 400 });
  }

  const newStatus = parsed.data.action === "respond-accept" ? "accepted" : "declined";
  await prisma.bookingDispute.update({
    where: { id: disputeId },
    data: { status: newStatus, respondedAt: new Date() },
  });

  await writeAuditLog({
    event: `dispute_${parsed.data.action}`,
    category: "booking",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "BookingDispute",
    targetId: disputeId,
  });

  const updated = await prisma.bookingDispute.findUniqueOrThrow({ where: { id: disputeId } });
  return NextResponse.json({ success: true, data: updated });
}
