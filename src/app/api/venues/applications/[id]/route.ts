import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { reserveOpenCall, chargeReservedCall, cancelReservedCall, confirmMilestoneCall } from "@/lib/open-call-payments";
import { writeAuditLog } from "@/lib/audit-log";
import { getLogger } from "@/lib/logger";

const log = getLogger("open-call-decisions");
const decisionSchema = z.object({
  decision: z.enum(["accept", "decline", "shortlist", "cancel-payment"]),
  expectedFee: z.number().finite().positive().optional(),
  paymentReviewed: z.boolean().optional(),
  expectedPaymentMethodId: z.string().optional(),
  expectedTotal: z.number().finite().min(0).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const venue = await prisma.venueProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!venue) return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  const application = await prisma.jobApplication.findFirst({ where: { id, jobListing: { venueId: venue.id }, musician: { user: { deletedAt: null } } } });
  if (!application) return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid decision" }, { status: 400 });
  try {
    const { decision } = parsed.data;
    if (decision === "cancel-payment") {
      const booking = await cancelReservedCall(id, venue.id);
      return NextResponse.json({ success: true, data: { booking } });
    }
    if (decision === "accept") {
      if (!parsed.data.paymentReviewed || parsed.data.expectedFee === undefined || parsed.data.expectedTotal === undefined || !parsed.data.expectedPaymentMethodId) return NextResponse.json({ success: false, message: "Review the fee breakdown and default card before confirming." }, { status: 400 });
      if (!venue.stripeCustomerId) return NextResponse.json({ success: false, message: "Add a default card in Payment Methods first." }, { status: 400 });
      const customer = await stripe.customers.retrieve(venue.stripeCustomerId);
      const paymentMethod = !customer.deleted ? customer.invoice_settings.default_payment_method : null;
      const paymentMethodId = typeof paymentMethod === "string" ? paymentMethod : paymentMethod?.id;
      if (!paymentMethodId) return NextResponse.json({ success: false, message: "Choose a default card in Payment Methods first." }, { status: 400 });
      if (parsed.data.expectedPaymentMethodId !== paymentMethodId) return NextResponse.json({ success: false, message: "Your default card changed. Review payment again." }, { status: 409 });
      const reservation = await reserveOpenCall(id, venue.id, parsed.data.expectedFee, venue.stripeCustomerId, paymentMethodId);
      if (parsed.data.expectedTotal !== reservation.booking.totalChargeAmount) return NextResponse.json({ success: false, message: "The charge total changed. Review payment again before confirming." }, { status: 409 });
      if (reservation.booking.paymentStructure === "milestone") {
        const booking = await confirmMilestoneCall(reservation.booking.id);
        await writeAuditLog({ event: "job_application_accept", category: "booking", level: "info", actorUserId: session.user.id, targetType: "Booking", targetId: booking.id });
        return NextResponse.json({ success: true, data: { booking } });
      }
      const result = await chargeReservedCall(reservation.booking, reservation.attempt);
      if (!result.confirmed) return NextResponse.json({ success: false, ...result }, { status: 402 });
      await writeAuditLog({ event: "job_application_accept", category: "booking", level: "info", actorUserId: session.user.id, targetType: "Booking", targetId: result.booking.id });
      return NextResponse.json({ success: true, data: { booking: result.booking } });
    }
    const updated = await prisma.jobApplication.updateMany({
      where: {
        id, status: { in: ["submitted", "shortlisted"] },
        OR: [{ booking: null }, { booking: { status: "cancelled", paymentStatus: { in: ["cancelled", "failed"] } } }],
      },
      data: { status: decision === "decline" ? "declined" : "shortlisted" },
    });
    if (!updated.count) return NextResponse.json({ success: false, message: "This application was decided or has a pending payment. Refresh before continuing." }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.warn({ err: error, applicationId: id }, "Open-call decision did not complete");
    return NextResponse.json({ success: false, message: error instanceof Error && !("type" in error) ? error.message : "Payment could not be completed. Retry to recover the existing attempt, or check Payment Methods." }, { status: 409 });
  }
}