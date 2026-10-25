import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe, toMinorUnits } from "@/lib/stripe";
import { calculateMarketplaceFees } from "@/lib/marketplace-fees";
import { isCallOpen, effectiveBudget } from "@/lib/open-call-utils";
import { hasArtistConflict } from "@/lib/artist-conflicts";
import { sendJobApplicationStatusEmail } from "@/lib/email-templates";
import { getLogger } from "@/lib/logger";
import { recordVenueCard } from "@/lib/p2p-policy";
import { planPayment, balanceDueAt, firstChargeFee, type MilestoneInput } from "@/lib/payment-structures";

const log = getLogger("open-call-payments");

export async function reserveOpenCall(applicationId: string, venueId: string, expectedFee: number, customerId: string, paymentMethodId: string) {
  void recordVenueCard(venueId, paymentMethodId);
  const original = await prisma.jobApplication.findUniqueOrThrow({ where: { id: applicationId } });
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "JobListing" WHERE "id" = ${original.jobListingId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "JobApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
    const application = await tx.jobApplication.findUniqueOrThrow({
      where: { id: applicationId }, include: { jobListing: true, slot: true, booking: true, musician: { include: { user: true } } },
    });
    const listing = application.jobListing;
    if (listing.venueId !== venueId || application.musician.user.deletedAt) throw new Error("Application not available.");
    if (application.booking?.status === "cancelled" && application.booking.paymentStatus === "pending") throw new Error("A refund is being reconciled. Wait before starting another payment.");
    if (application.booking?.paymentStatus === "paid") return { booking: application.booking, attempt: application.paymentAttempt };
    if (!["submitted", "shortlisted"].includes(application.status)) throw new Error("This application has already been decided.");
    const resuming = application.booking?.status === "pending";
    if (resuming && application.booking?.stripePaymentMethodId !== paymentMethodId) throw new Error("Cancel the existing payment attempt before switching cards.");
    if (resuming && application.booking?.responseDeadline && application.booking.responseDeadline <= new Date()) throw new Error("This payment attempt expired. Cancel it to free the slot, then review a new booking.");
    if (!resuming && !isCallOpen(listing)) throw new Error("This call is closed or expired.");
    if (!listing.eventStartsAt || !listing.eventEndsAt || !listing.eventDate) throw new Error("The call needs a complete schedule before accepting an applicant.");
    const slot = application.slot;
    if (!slot || slot.jobListingId !== listing.id || slot.filled || (slot.reservedByApplicationId && slot.reservedByApplicationId !== applicationId)) throw new Error("This lineup slot is no longer available.");
    if (!application.availabilityConfirmed) throw new Error("The artist must confirm availability before you can hire them.");
    const fee = application.proposedFee ?? effectiveBudget(slot, listing).budgetMin;
    if (fee <= 0 || fee !== expectedFee) throw new Error("The agreed fee changed. Refresh and review the payment breakdown.");
    await tx.$queryRaw`SELECT "id" FROM "MusicianProfile" WHERE "id" = ${application.musicianId} FOR UPDATE`;
    if (await hasArtistConflict(tx, application.musicianId, listing.eventStartsAt, listing.eventEndsAt, application.booking?.id)) throw new Error("The artist has a conflicting booking or pending payment.");
    if (resuming) return { booking: application.booking!, attempt: application.paymentAttempt };
    // Booking amount fields describe the FIRST charge (see schema comment on
    // Booking.paymentStructure): everything for full_sum, the deposit for
    // deposit_balance, nothing for milestone.
    const structure = application.selectedPaymentStructure;
    const plan = planPayment({ structure, fee, currency: listing.currency, depositPercent: listing.depositPercent });
    const fees = plan.first ?? calculateMarketplaceFees(0, { currency: listing.currency, passProcessorFeeToVenue: false });
    const data = {
      paymentStructure: structure,
      depositAmount: structure === "deposit_balance" ? plan.firstChargeFee : 0,
      balanceDueAt: structure === "deposit_balance" ? balanceDueAt(listing.eventStartsAt) : null,
      title: listing.title, eventType: listing.eventType, eventDate: listing.eventDate,
      startTime: listing.startTime!, endTime: listing.endTime!, venueAddress: listing.venueAddress,
      setupNotes: listing.stageSpecs,
      requiredServices: (Array.isArray(listing.requiredServices) ? listing.requiredServices : []).filter((item): item is string => typeof item === "string").map((label) => ({ label, included: true })),
      equipmentProvided: Array.isArray(listing.equipmentProvided) ? listing.equipmentProvided : [], fee, currency: listing.currency,
      platformFeeRate: fees.platformFeeRate, platformFeeAmount: fees.platformFeeAmount,
      processorFeeEstimate: fees.processorFeeEstimate, totalChargeAmount: fees.totalChargeAmount,
      netPayoutAmount: fees.artistPayoutAmount, stripeCustomerId: customerId, stripePaymentMethodId: paymentMethodId,
      stripePaymentIntentId: null, status: "pending" as const, paymentStatus: "pending" as const,
      payoutReleaseAt: new Date(listing.eventEndsAt.getTime() + 86400000),
      responseDeadline: new Date(Math.min(Date.now() + 30 * 60000, listing.eventStartsAt.getTime(), listing.applicationDeadline?.getTime() ?? Infinity)),
    };
    const booking = application.booking
      ? await tx.booking.update({ where: { id: application.booking.id }, data })
      : await tx.booking.create({ data: { ...data, musicianId: application.musicianId, venueId, jobApplicationId: applicationId, source: "job_application" } });
    await tx.jobListingSlot.update({ where: { id: slot.id }, data: { reservedByApplicationId: applicationId } });
    const updated = await tx.jobApplication.update({ where: { id: applicationId }, data: { paymentAttempt: { increment: 1 } } });
    return { booking, attempt: updated.paymentAttempt };
  });
}

export async function reconcileOpenCallRefund(bookingId: string, intentId: string, full: boolean) {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (full && booking.stripePaymentIntentId === intentId && ["pending", "cancelled"].includes(booking.status)) {
    await releaseCallReservation(bookingId, "refunded", intentId);
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { id: bookingId, stripePaymentIntentId: intentId },
      data: { paymentStatus: full ? "refunded" : "partially_refunded" },
    });
    await tx.marketplaceTransaction.updateMany({
      where: { bookingId, providerPaymentId: intentId },
      data: { status: full ? "refunded" : "partially_refunded", refundedAt: new Date() },
    });
  });
}

export async function confirmOpenCallPayment(bookingId: string, intent: Stripe.PaymentIntent) {
  if (intent.status !== "succeeded") throw new Error("Payment has not succeeded.");
  const paymentBooking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (paymentBooking.stripePaymentIntentId !== intent.id && await prisma.marketplaceTransaction.findFirst({ where: { bookingId, providerPaymentId: intent.id, status: "refunded" } })) return paymentBooking;
  if (paymentBooking.stripePaymentIntentId !== intent.id || intent.amount_received !== toMinorUnits(paymentBooking.totalChargeAmount) || intent.currency !== paymentBooking.currency.toLowerCase() || intent.metadata.bookingId !== bookingId) throw new Error("Payment does not match the reserved booking.");
  if (paymentBooking.paymentStatus === "refunded") return paymentBooking;
  if (paymentBooking.paymentStatus !== "paid" && paymentBooking.responseDeadline && paymentBooking.responseDeadline <= new Date()) {
    const claimed = await prisma.$transaction(async (tx) => {
      const application = await tx.jobApplication.findUniqueOrThrow({ where: { id: paymentBooking.jobApplicationId! } });
      await tx.$queryRaw`SELECT "id" FROM "JobListing" WHERE "id" = ${application.jobListingId} FOR UPDATE`;
      const fresh = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
      if (fresh.stripePaymentIntentId !== intent.id) return false;
      if (fresh.paymentStatus === "paid" || fresh.paymentStatus === "refunded") return false;
      await tx.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
      return true;
    });
    if (!claimed) return prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    const refund = await stripe.refunds.create({ payment_intent: intent.id, metadata: { bookingId, reason: "open_call_payment_expired" } }, { idempotencyKey: `expired-open-call-refund-${intent.id}` });
    if (refund.status !== "succeeded" && (await stripe.refunds.retrieve(refund.id)).status !== "succeeded") throw new Error("Expired payment refund is pending. This booking is not confirmed.");
    await releaseCallReservation(bookingId, "refunded", intent.id);
    return prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  }
  const result = await prisma.$transaction(async (tx) => {
    const original = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (!original.jobApplicationId) throw new Error("Not an open-call booking.");
    const application = await tx.jobApplication.findUniqueOrThrow({ where: { id: original.jobApplicationId } });
    await tx.$queryRaw`SELECT "id" FROM "JobListing" WHERE "id" = ${application.jobListingId} FOR UPDATE`;
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (booking.stripePaymentIntentId !== intent.id || intent.amount_received !== toMinorUnits(booking.totalChargeAmount) || intent.currency !== booking.currency.toLowerCase() || intent.metadata.bookingId !== booking.id) throw new Error("Payment does not match the reserved booking.");
    if (booking.paymentStatus === "paid") return { booking, newlyConfirmed: false };
    if (booking.status !== "pending") throw new Error("This booking is no longer awaiting payment.");
    const reserved = await tx.jobListingSlot.updateMany({
      where: { id: application.slotId ?? "", reservedByApplicationId: application.id, filled: false },
      data: { filled: true },
    });
    if (reserved.count !== 1) throw new Error("The slot reservation is missing. Payment needs reconciliation.");
    await tx.jobApplication.update({ where: { id: application.id }, data: { status: "accepted" } });
    const updated = await tx.booking.update({ where: { id: booking.id }, data: { status: "accepted", paymentStatus: "paid" } });
    await tx.marketplaceTransaction.create({
      data: {
        bookingId: booking.id, provider: "stripe", providerPaymentId: intent.id,
        transactionType: booking.paymentStructure === "deposit_balance" ? "deposit" : "full",
        performanceFee: firstChargeFee(booking), platformFeeRate: booking.platformFeeRate,
        platformFeeAmount: booking.platformFeeAmount, processorFeeEstimate: booking.processorFeeEstimate,
        totalChargeAmount: booking.totalChargeAmount, artistPayoutAmount: booking.netPayoutAmount,
        currency: booking.currency, status: "paid", paidAt: new Date(),
      },
    });
    if (await tx.jobListingSlot.count({ where: { jobListingId: application.jobListingId, filled: false } }) === 0) {
      await tx.jobListing.update({ where: { id: application.jobListingId }, data: { status: "filled" } });
    }
    return { booking: updated, newlyConfirmed: true };
  });
  if (result.newlyConfirmed) {
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { musician: { include: { user: true } }, venue: true } });
    sendJobApplicationStatusEmail({ email: booking.musician.user.email, name: booking.musician.stageName }, {
      jobTitle: booking.title, venueName: booking.venue.venueName, status: "accepted",
    }).catch((error) => log.error({ err: error }, "Application confirmation email failed"));
  }
  return result.booking;
}

export async function chargeReservedCall(booking: Awaited<ReturnType<typeof reserveOpenCall>>["booking"], attempt: number) {
  if (booking.paymentStatus === "paid") return { confirmed: true, booking };
  const key = `open-call-${booking.id}-${attempt}`;
  let intent = booking.stripePaymentIntentId ? await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId) : await stripe.paymentIntents.create({
    amount: toMinorUnits(booking.totalChargeAmount), currency: booking.currency.toLowerCase(),
    customer: booking.stripeCustomerId!, payment_method: booking.stripePaymentMethodId!,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    metadata: { bookingId: booking.id, jobApplicationId: booking.jobApplicationId!, source: "open_call" },
  }, { idempotencyKey: key });
  const attached = await prisma.booking.updateMany({
    where: { id: booking.id, status: "pending", paymentStatus: "pending", jobApplication: { paymentAttempt: attempt } },
    data: { stripePaymentIntentId: intent.id },
  });
  if (!attached.count) {
    const current = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    if (current.paymentStatus === "paid") return { confirmed: true, booking: current };
    throw new Error("The payment attempt changed. Refresh before continuing.");
  }
  if (intent.status === "requires_confirmation") {
    if (booking.responseDeadline && booking.responseDeadline <= new Date()) {
      await cancelReservedCall(booking.jobApplicationId!, booking.venueId, { paymentAttempt: attempt, onlyIfExpired: true });
      throw new Error("Payment attempt expired and was cancelled.");
    }
    try { intent = await stripe.paymentIntents.confirm(intent.id, { off_session: true }, { idempotencyKey: `${key}-confirm` }); }
    catch { intent = await stripe.paymentIntents.retrieve(intent.id); }
  }
  if (intent.status === "succeeded") {
    const confirmed = await confirmOpenCallPayment(booking.id, intent);
    return { confirmed: confirmed.status === "accepted", booking: confirmed, message: confirmed.paymentStatus === "refunded" ? "The payment window expired. The charge was refunded; no booking was made." : undefined };
  }
  return {
    confirmed: false, booking, requiresAction: intent.status === "requires_action",
    clientSecret: intent.status === "requires_action" ? intent.client_secret : undefined,
    message: intent.status === "processing" ? "Payment is processing. Refresh to check confirmation." : "Payment is not complete. Authenticate your card, or cancel this payment attempt and update your saved card.",
  };
}

export async function cancelReservedCall(applicationId: string, venueId: string, options: { paymentAttempt?: number; onlyIfExpired?: boolean } = {}) {
  const booking = await prisma.booking.findUnique({ where: { jobApplicationId: applicationId }, include: { jobApplication: true } });
  if (!booking || booking.venueId !== venueId) throw new Error("No pending payment to cancel.");
  const expectedAttempt = options.paymentAttempt ?? booking?.jobApplication?.paymentAttempt;
  if (booking && (booking.jobApplication?.paymentAttempt !== expectedAttempt || (options.onlyIfExpired && (!booking.responseDeadline || booking.responseDeadline > new Date())))) return booking;
  if (!booking || booking.venueId !== venueId || (booking.status !== "pending" && !(booking.status === "cancelled" && booking.paymentStatus === "pending"))) throw new Error("No pending payment to cancel.");
  if (booking.stripePaymentIntentId) {
    const intent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
    if (intent.status === "succeeded") return confirmOpenCallPayment(booking.id, intent);
    if (intent.status !== "canceled") await stripe.paymentIntents.cancel(intent.id, {}, { idempotencyKey: `cancel-open-call-${intent.id}` });
  } else {
    const application = booking.jobApplication!;
    const intent = await stripe.paymentIntents.create({
      amount: toMinorUnits(booking.totalChargeAmount), currency: booking.currency.toLowerCase(),
      customer: booking.stripeCustomerId!, payment_method: booking.stripePaymentMethodId!,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { bookingId: booking.id, jobApplicationId: applicationId, source: "open_call" },
    }, { idempotencyKey: `open-call-${booking.id}-${application.paymentAttempt}` });
    const attached = await prisma.booking.updateMany({ where: { id: booking.id, status: "pending", stripePaymentIntentId: null, jobApplication: { paymentAttempt: expectedAttempt } }, data: { stripePaymentIntentId: intent.id } });
    if (!attached.count) return prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    return cancelReservedCall(applicationId, venueId, { ...options, paymentAttempt: expectedAttempt });
  }
  await releaseCallReservation(booking.id, "cancelled", booking.stripePaymentIntentId!);
  return prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
}

async function releaseCallReservation(bookingId: string, paymentStatus: "cancelled" | "refunded", expectedIntentId: string) {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { jobApplication: true } });
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "JobListing" WHERE "id" = ${booking.jobApplication!.jobListingId} FOR UPDATE`;
    const updated = await tx.booking.updateMany({ where: { id: booking.id, status: { in: ["pending", "cancelled"] }, paymentStatus: { in: ["pending", "authorized", ...(paymentStatus === "refunded" ? ["refunded" as const] : [])] }, stripePaymentIntentId: expectedIntentId }, data: { status: "cancelled", paymentStatus } });
    if (updated.count) await tx.jobListingSlot.updateMany({ where: { reservedByApplicationId: booking.jobApplicationId, filled: false }, data: { reservedByApplicationId: null } });
    if (updated.count && paymentStatus === "refunded" && !await tx.marketplaceTransaction.findFirst({ where: { bookingId, providerPaymentId: expectedIntentId } })) await tx.marketplaceTransaction.create({
      data: {
        bookingId, provider: "stripe", providerPaymentId: expectedIntentId,
        transactionType: booking.paymentStructure === "deposit_balance" ? "deposit" : "full",
        performanceFee: firstChargeFee(booking), platformFeeRate: booking.platformFeeRate,
        platformFeeAmount: booking.platformFeeAmount, processorFeeEstimate: booking.processorFeeEstimate,
        totalChargeAmount: booking.totalChargeAmount, artistPayoutAmount: booking.netPayoutAmount,
        currency: booking.currency, status: "refunded", refundedAt: new Date(),
      },
    });
  });
}

/**
 * Milestone bookings charge nothing when the venue hires: the slot is
 * confirmed immediately and each milestone is charged when the venue
 * approves it (see api/bookings/[id]/milestones).
 */
export async function confirmMilestoneCall(bookingId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const original = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (!original.jobApplicationId || original.paymentStructure !== "milestone") throw new Error("Not a milestone booking.");
    const application = await tx.jobApplication.findUniqueOrThrow({ where: { id: original.jobApplicationId } });
    await tx.$queryRaw`SELECT "id" FROM "JobListing" WHERE "id" = ${application.jobListingId} FOR UPDATE`;
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (booking.status === "accepted") return { booking, newlyConfirmed: false };
    if (booking.status !== "pending") throw new Error("This booking is no longer awaiting confirmation.");
    const milestones = Array.isArray(application.proposedMilestones) ? application.proposedMilestones as MilestoneInput[] : [];
    if (milestones.length < 2) throw new Error("This application has no milestone plan.");
    const reserved = await tx.jobListingSlot.updateMany({
      where: { id: application.slotId ?? "", reservedByApplicationId: application.id, filled: false },
      data: { filled: true },
    });
    if (reserved.count !== 1) throw new Error("The slot reservation is missing.");
    await tx.jobApplication.update({ where: { id: application.id }, data: { status: "accepted" } });
    await tx.bookingMilestone.createMany({ data: milestones.map((m, order) => ({ bookingId, label: m.label, amount: m.amount, order })) });
    const updated = await tx.booking.update({ where: { id: bookingId }, data: { status: "accepted", paymentStatus: "authorized", responseDeadline: null } });
    if (await tx.jobListingSlot.count({ where: { jobListingId: application.jobListingId, filled: false } }) === 0) {
      await tx.jobListing.update({ where: { id: application.jobListingId }, data: { status: "filled" } });
    }
    return { booking: updated, newlyConfirmed: true };
  });
  if (result.newlyConfirmed) {
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { musician: { include: { user: true } }, venue: true } });
    sendJobApplicationStatusEmail({ email: booking.musician.user.email, name: booking.musician.stageName }, {
      jobTitle: booking.title, venueName: booking.venue.venueName, status: "accepted",
    }).catch((error) => log.error({ err: error }, "Application confirmation email failed"));
  }
  return result.booking;
}
