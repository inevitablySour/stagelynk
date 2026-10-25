import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidEquipmentSelection } from "@/lib/equipment-catalog/selectable";

const equipmentSchema = z.object({
  offerings: z.array(z.object({
    equipmentId: z.string().min(1),
    quantity: z.number().int().min(1).max(50),
    notes: z.string().trim().max(300).default(""),
  })).max(100).refine((items) => new Set(items.map((item) => item.equipmentId)).size === items.length, "Do not repeat equipment items"),
});

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const musician = await prisma.musicianProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!musician) return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  const parsed = equipmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid equipment quantities or notes" }, { status: 400 });
  const current = await prisma.musicianEquipmentOwned.findMany({ where: { musicianId: musician.id }, select: { equipmentId: true } });
  const invalid = await invalidEquipmentSelection(parsed.data.offerings.map((item) => item.equipmentId), { previouslySelected: current.map((c) => c.equipmentId) });
  if (invalid) return NextResponse.json({ success: false, message: invalid }, { status: 400 });
  await prisma.$transaction(async (tx) => {
    await tx.musicianEquipmentOwned.deleteMany({ where: { musicianId: musician.id } });
    await tx.musicianEquipmentOwned.createMany({ data: parsed.data.offerings.map((item) => ({ ...item, musicianId: musician.id })) });
  });
  return NextResponse.json({ success: true });
}
