import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";
import { invalidEquipmentSelection } from "@/lib/equipment-catalog/selectable";

const equipmentOfferingsSchema = z.object({
  offerings: z.array(
    z.object({
      equipmentId: z.string(),
      quantity: z.number().int().min(1).max(50),
      notes: z.string().max(300).optional(),
    })
  ),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!venue) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const offerings = await prisma.venueEquipmentOffering.findMany({
    where: { venueId: venue.id },
    include: { equipment: true },
  });

  return NextResponse.json({ success: true, data: offerings });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!venue) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const parsed = equipmentOfferingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid equipment list", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const current = await prisma.venueEquipmentOffering.findMany({ where: { venueId: venue.id }, select: { equipmentId: true } });
  const invalid = await invalidEquipmentSelection(parsed.data.offerings.map((o) => o.equipmentId), {
    previouslySelected: current.map((c) => c.equipmentId),
  });
  if (invalid) return NextResponse.json({ success: false, message: invalid }, { status: 400 });

  await prisma.$transaction([
    prisma.venueEquipmentOffering.deleteMany({ where: { venueId: venue.id } }),
    ...parsed.data.offerings.map((offering) =>
      prisma.venueEquipmentOffering.create({
        data: {
          venueId: venue.id,
          equipmentId: offering.equipmentId,
          quantity: offering.quantity,
          notes: offering.notes ?? "",
        },
      })
    ),
  ]);

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "profile_equipment_update",
    category: "profile",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "VenueProfile",
    targetId: venue.id,
  });

  const updated = await prisma.venueEquipmentOffering.findMany({
    where: { venueId: venue.id },
    include: { equipment: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
