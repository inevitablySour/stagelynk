import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jobApplicationSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";
import { sendJobApplicationReceivedEmail } from "@/lib/email-templates";
import { getLogger } from "@/lib/logger";
import { validateApplicationPayment } from "@/lib/payment-structures";
import { isCallOpen, effectiveBudget } from "@/lib/open-call-utils";
import { hasArtistConflict } from "@/lib/artist-conflicts";

const log = getLogger("api-musicians-jobs-apply");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobListingId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const musician = await prisma.musicianProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Musician profile not found" }, { status: 404 });
  }

  const listing = await prisma.jobListing.findUnique({
    where: { id: jobListingId },
    include: { venue: { select: { venueName: true, user: { select: { email: true, deletedAt: true } } } } },
  });
  if (!listing || listing.venue.user.deletedAt || !isCallOpen(listing)) {
    return NextResponse.json({ success: false, message: "This listing is no longer accepting applications" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = jobApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid application", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.jobApplication.findUnique({
    where: { jobListingId_musicianId: { jobListingId, musicianId: musician.id } },
  });
  if (existing) {
    return NextResponse.json({ success: false, message: "You've already applied to this listing" }, { status: 400 });
  }

  let application;
  try {
    application = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "JobListing" WHERE "id" = ${jobListingId} FOR UPDATE`;
      const fresh = await tx.jobListing.findUniqueOrThrow({ where: { id: jobListingId }, include: { slots: true } });
      if (!isCallOpen(fresh) || !fresh.eventStartsAt || !fresh.eventEndsAt) throw new Error("This call is closed, expired, or missing its schedule.");
      const slot = parsed.data.slotId ? fresh.slots.find((item) => item.id === parsed.data.slotId) : fresh.slots.length === 1 ? fresh.slots[0] : undefined;
      if (!slot || slot.filled || slot.reservedByApplicationId) throw new Error("Choose an available lineup slot.");
      const agreedFee = parsed.data.proposedFee ?? (musician.performanceFee && musician.performanceFee > 0 ? musician.performanceFee : effectiveBudget(slot, fresh).budgetMin);
      if (agreedFee <= 0) throw new Error("Review and confirm a positive artist fee before applying.");
      const payment = validateApplicationPayment(fresh.offeredPaymentStructures, parsed.data, agreedFee);
      if (!payment.ok) throw new Error(payment.message);
      if (await hasArtistConflict(tx, musician.id, fresh.eventStartsAt, fresh.eventEndsAt)) throw new Error("You already have a conflicting booking or pending open-call payment.");
      return tx.jobApplication.create({
        data: {
          jobListingId, musicianId: musician.id, slotId: slot.id,
          coverMessage: parsed.data.coverMessage, proposedFee: agreedFee,
          availabilityNotes: parsed.data.availabilityNotes, availabilityConfirmed: true,
          selectedPaymentStructure: payment.structure, proposedMilestones: payment.milestones ?? undefined,
        },
      });
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as { code?: string }).code === "P2002" ? "You've already applied to this listing." : (error as Error).message }, { status: 409 });
  }

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "job_application_submit",
    category: "job",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "JobApplication",
    targetId: application.id,
  });

  if (listing.venue.user.email) {
    sendJobApplicationReceivedEmail(
      { email: listing.venue.user.email, name: listing.venue.venueName },
      { artistName: musician.stageName, jobTitle: listing.title }
    ).catch((err) => log.error({ err }, "Failed to send job application received email"));
  }

  return NextResponse.json({ success: true, data: application }, { status: 201 });
}
