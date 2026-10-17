import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jobListingSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";
import { validateCallForPublishing } from "@/lib/open-call-validation";

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

  const existing = await prisma.jobListing.findUnique({ where: { id } });
  if (!existing || existing.venueId !== venue.id) {
    return NextResponse.json({ success: false, message: "Job listing not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = jobListingSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid job listing update", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { eventDate, applicationDeadline, slotLabels, slots, ...rest } = parsed.data;
  let listing;
  try {
    listing = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "JobListing" WHERE "id" = ${id} FOR UPDATE`;
      const fresh = await tx.jobListing.findUniqueOrThrow({ where: { id }, include: { _count: { select: { applications: true } }, slots: true } });
      if (fresh.slots.some((slot) => slot.reservedByApplicationId && !slot.filled)) throw new Error("Resolve the pending payment before changing this call.");
      if (fresh._count.applications && Object.keys(parsed.data).some((key) => key !== "status")) throw new Error("Calls with applications cannot change their brief, schedule, budget or lineup. Pause or close this call and create a new one.");
      if (fresh._count.applications && rest.status === "draft") throw new Error("A call with applications cannot return to draft.");
      const fields = {
        ...rest,
        ...(eventDate !== undefined ? { eventDate: eventDate ? new Date(eventDate) : null } : {}),
        ...(applicationDeadline !== undefined ? { applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null } : {}),
      };
      const merged = { ...fresh, ...fields };
      if (merged.budgetMax < merged.budgetMin) throw new Error("Maximum budget cannot be below minimum budget.");
      const instants = merged.status === "published" ? validateCallForPublishing(merged) : {};
      const ids = rest.eventEquipment?.map((item) => item.equipmentId) ?? [];
      if (ids.length && await tx.equipmentItem.count({ where: { id: { in: ids } } }) !== ids.length) throw new Error("Choose equipment from the catalog.");
      const lineup = slots ?? (slotLabels ? slotLabels.map((label) => ({ label })) : undefined);
      return tx.jobListing.update({
        where: { id },
        data: { ...fields, ...instants, ...(lineup ? { slots: { deleteMany: {}, create: (lineup.length ? lineup : [{ label: "Performance" }]).map((slot, order) => ({ ...slot, order })) } } : {}) },
      });
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 400 });
  }

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "job_listing_update",
    category: "job",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "JobListing",
    targetId: listing.id,
    metadata: { fields: Object.keys(parsed.data) },
  });

  return NextResponse.json({ success: true, data: listing });
}
