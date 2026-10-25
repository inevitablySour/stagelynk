import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidEquipmentSelection } from "@/lib/equipment-catalog/selectable";
import { jobListingSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";
import { validateCallForPublishing } from "@/lib/open-call-validation";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!venue) {
    return NextResponse.json({ success: false, message: "Venue profile not found" }, { status: 404 });
  }

  const listings = await prisma.jobListing.findMany({
    where: { venueId: venue.id },
    include: { _count: { select: { applications: true } }, slots: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: listings });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!venue) {
    return NextResponse.json({ success: false, message: "Venue profile not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = jobListingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid job listing", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { eventDate, applicationDeadline, genres, requiredServices, equipmentProvided, status, slotLabels, slots, ...rest } = parsed.data;
  const schedule = {
    eventDate: eventDate ? new Date(eventDate) : null,
    startTime: rest.startTime ?? null, endTime: rest.endTime ?? null,
    timeZone: rest.timeZone ?? "Europe/Brussels", venueAddress: rest.venueAddress ?? "",
    location: rest.location ?? "", stageSpecs: rest.stageSpecs ?? "",
    budgetMin: rest.budgetMin ?? 0, budgetMax: rest.budgetMax ?? 0,
    genres: genres ?? [], applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
  };
  if (schedule.budgetMax < schedule.budgetMin) return NextResponse.json({ success: false, message: "Maximum budget cannot be below minimum budget." }, { status: 400 });
  let instants = {};
  try { if (status === "published") instants = validateCallForPublishing(schedule); }
  catch (error) { return NextResponse.json({ success: false, message: (error as Error).message }, { status: 400 }); }
  const equipmentIds = rest.eventEquipment?.map((item) => item.equipmentId) ?? [];
  const invalidEquipment = await invalidEquipmentSelection(equipmentIds, { hardwareOnly: true });
  if (invalidEquipment) return NextResponse.json({ success: false, message: invalidEquipment }, { status: 400 });
  const lineup = slots ?? (slotLabels?.length ? slotLabels.map((label) => ({ label })) : [{ label: "Performance" }]);

  const listing = await prisma.jobListing.create({
    data: {
      ...rest,
      ...instants,
      venueId: venue.id,
      eventDate: eventDate ? new Date(eventDate) : undefined,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : undefined,
      genres: genres ?? [],
      requiredServices: requiredServices ?? [],
      equipmentProvided: equipmentProvided ?? [],
      status: status ?? "draft",
      slots: { create: lineup.map((slot, index) => ({ ...slot, order: index })) },
    },
    include: { slots: { orderBy: { order: "asc" } } },
  });

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "job_listing_create",
    category: "job",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "JobListing",
    targetId: listing.id,
  });

  return NextResponse.json({ success: true, data: listing }, { status: 201 });
}
