import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";

const equipmentNeedsSchema = z.object({
  needs: z.array(
    z.object({
      equipmentId: z.string(),
      quantity: z.number().int().min(1).max(50),
      notes: z.string().max(300).optional(),
    })
  ),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const needs = await prisma.musicianEquipmentNeed.findMany({
    where: { musicianId: musician.id },
    include: { equipment: true },
  });

  return NextResponse.json({ success: true, data: needs });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const parsed = equipmentNeedsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid technical rider", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.musicianEquipmentNeed.deleteMany({ where: { musicianId: musician.id } }),
    ...parsed.data.needs.map((need) =>
      prisma.musicianEquipmentNeed.create({
        data: {
          musicianId: musician.id,
          equipmentId: need.equipmentId,
          quantity: need.quantity,
          notes: need.notes ?? "",
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
    targetType: "MusicianProfile",
    targetId: musician.id,
  });

  const updated = await prisma.musicianEquipmentNeed.findMany({
    where: { musicianId: musician.id },
    include: { equipment: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
