import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe, toMinorUnits } from "@/lib/stripe";
import { calculateMarketplaceFees } from "@/lib/marketplace-fees";
import { writeAuditLog } from "@/lib/audit-log";
import { getLogger } from "@/lib/logger";
import { recordVenueCard } from "@/lib/p2p-policy";
import { planPayment, balanceDueAt, type MilestoneInput } from "@/lib/payment-structures";

const log = getLogger("api-venues-project-applications");

const decisionSchema = z.object({
  decision: z.enum(["accept", "decline"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!venue) {
    return NextResponse.json({ success: false, message: "Venue profile not found" }, { status: 404 });
  }

  const application = await prisma.projectApplication.findFirst({
    where: { id, projectListing: { venueId: venue.id }, musician: { user: { deletedAt: null } } },
    include: { projectListing: true, musician: { include: { user: { select: { email: true } } } } },
  });
  if (!application) {
    return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
  }

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid decision" }, { status: 400 });
  }

  if (application.status !== "submitted") {
    return NextResponse.json({ success: false, message: "This application has already been decided." }, { status: 409 });
  }

  if (parsed.data.decision === "decline") {
    await prisma.projectApplication.update({ where: { id }, data: { status: "declined" } });
    return NextResponse.json({ success: true });
  }

  if (!venue.stripeCustomerId) {
    return NextResponse.json({ success: false, message: "Add a default card in Payment Methods first." }, { status: 400 });
  }
  const customer = await stripe.customers.retrieve(venue.stripeCustomerId);
  const paymentMethod = !customer.deleted ? customer.invoice_settings.default_payment_method : null;
  const paymentMethodId = typeof paymentMethod === "string" ? paymentMethod : paymentMethod?.id;
  if (!paymentMethodId) {
    return NextResponse.json({ success: false, message: "Choose a default card in Payment Methods first." }, { status: 400 });
  }

  const fee = application.proposedFee ?? application.projectListing.budgetMin;
  if (fee <= 0) {
    return NextResponse.json({ success: false, message: "No agreed fee for this application. Have the artist propose one." }, { status: 400 });
  }
  const structure = application.selectedPaymentStructure;
  const milestones = Array.isArray(application.proposedMilestones) ? application.proposedMilestones as MilestoneInput[] : [];
  if (structure === "milestone" && milestones.length < 2) {
    return NextResponse.json({ success: false, message: "This application has no milestone plan." }, { status: 400 });
  }
  const plan = planPayment({ structure, fee, currency: application.projectListing.currency, depositPercent: application.projectListing.depositPercent });
  const fees = plan.first ?? calculateMarketplaceFees(0, { currency: application.projectListing.currency, passProcessorFeeToVenue: false });

  void recordVenueCard(venue.id, paymentMethodId);

  try {
    // Milestone projects charge nothing up front; each milestone is charged on approval.
    const paymentIntent = structure === "milestone" ? null : await stripe.paymentIntents.create({
      amount: toMinorUnits(fees.totalChargeAmount),
      currency: application.projectListing.currency.toLowerCase(),
      customer: venue.stripeCustomerId!,
      payment_method: paymentMethodId,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      confirm: true,
      off_session: true,
      metadata: { projectApplicationId: application.id, source: "project_application" },
    });

    if (paymentIntent && paymentIntent.status !== "succeeded") {
      return NextResponse.json({ success: false, message: "The charge requires further authentication. Ask the client to try again from their bank's app, or use a different card." }, { status: 402 });
    }

    const deadlineDate = application.projectListing.deadline ?? new Date(Date.now() + 30 * 86400000);

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          musicianId: application.musicianId,
          venueId: venue.id,
          projectApplicationId: application.id,
          title: application.projectListing.title,
          eventType: "Project",
          eventDate: deadlineDate,
          dueDate: deadlineDate,
          startTime: "00:00",
          endTime: "00:00",
          fee,
          paymentStructure: structure,
          depositAmount: structure === "deposit_balance" ? plan.firstChargeFee : 0,
          balanceDueAt: structure === "deposit_balance" ? balanceDueAt(deadlineDate) : null,
          currency: application.projectListing.currency,
          platformFeeRate: fees.platformFeeRate,
          platformFeeAmount: fees.platformFeeAmount,
          processorFeeEstimate: fees.processorFeeEstimate,
          totalChargeAmount: fees.totalChargeAmount,
          netPayoutAmount: fees.artistPayoutAmount,
          stripeCustomerId: venue.stripeCustomerId,
          stripePaymentMethodId: paymentMethodId,
          stripePaymentIntentId: paymentIntent?.id ?? null,
          status: "accepted",
          paymentStatus: structure === "milestone" ? "authorized" : "paid",
          source: "project_application",
          payoutReleaseAt: new Date(deadlineDate.getTime() + 86400000),
        },
      });
      await tx.projectApplication.update({ where: { id: application.id }, data: { status: "accepted" } });
      await tx.projectListing.update({ where: { id: application.projectListingId }, data: { status: "filled" } });
      if (structure === "milestone") {
        await tx.bookingMilestone.createMany({ data: milestones.map((m, order) => ({ bookingId: booking.id, label: m.label, amount: m.amount, order })) });
      }
      if (paymentIntent) await tx.marketplaceTransaction.create({
        data: {
          bookingId: booking.id,
          provider: "stripe",
          providerPaymentId: paymentIntent.id,
          transactionType: structure === "deposit_balance" ? "deposit" : "full",
          performanceFee: plan.firstChargeFee,
          platformFeeRate: fees.platformFeeRate,
          platformFeeAmount: fees.platformFeeAmount,
          processorFeeEstimate: fees.processorFeeEstimate,
          totalChargeAmount: fees.totalChargeAmount,
          artistPayoutAmount: fees.artistPayoutAmount,
          currency: application.projectListing.currency,
          status: "paid",
          paidAt: new Date(),
        },
      });
      return booking;
    });

    await writeAuditLog({
      event: "project_application_accept",
      category: "booking",
      level: "info",
      actorUserId: session.user.id,
      targetType: "Booking",
      targetId: result.id,
    });

    return NextResponse.json({ success: true, data: { booking: result } });
  } catch (error) {
    log.warn({ err: error, applicationId: id }, "Project application accept-charge failed");
    return NextResponse.json({ success: false, message: "The charge couldn't be completed. Check the payment method and try again." }, { status: 402 });
  }
}
