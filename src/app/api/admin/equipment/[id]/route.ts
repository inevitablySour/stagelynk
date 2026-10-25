import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { EQUIPMENT_GROUP_KEYS } from "@/lib/equipment-catalog/groups";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  category: z.string().trim().min(2).max(80).optional(),
  group: z.enum(EQUIPMENT_GROUP_KEYS as [string, ...string[]]).optional(),
  kind: z.enum(["hardware", "software"]).optional(),
  description: z.string().trim().max(300).nullable().optional(),
  status: z.enum(["active", "pending", "rejected", "hidden"]).optional(),
  // Hands name/category/group back to the sync source.
  unlock: z.literal(true).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid update." }, { status: 400 });

  const existing = await prisma.equipmentItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, message: "Item not found." }, { status: 404 });

  const { unlock, ...fields } = parsed.data;
  const editsSyncedField = (["name", "category", "group"] as const).some((f) => fields[f] !== undefined && fields[f] !== existing[f]);
  const item = await prisma.equipmentItem.update({
    where: { id },
    data: {
      ...fields,
      ...(unlock ? { adminLocked: false } : editsSyncedField && existing.source !== "custom" ? { adminLocked: true } : {}),
    },
  });

  await writeAuditLog({
    event: "equipment_item_updated", category: "admin", actorUserId: session.user.id, targetType: "EquipmentItem", targetId: id,
    metadata: { changed: Object.keys(parsed.data), status: item.status },
  });
  return NextResponse.json({ success: true, data: item });
}
