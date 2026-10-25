import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit-log";

const ACTION_STATUS = { approve: "active", reject: "rejected", hide: "hidden", restore: "active" } as const;

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  action: z.enum(["approve", "reject", "hide", "restore"]),
});

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const parsed = bulkSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid bulk action." }, { status: 400 });
  const { ids, action } = parsed.data;

  const result = await prisma.equipmentItem.updateMany({ where: { id: { in: ids } }, data: { status: ACTION_STATUS[action] } });
  await writeAuditLog({ event: `equipment_items_${action}`, category: "admin", actorUserId: session.user.id, targetType: "EquipmentItem", metadata: { count: result.count } });
  return NextResponse.json({ success: true, data: { updated: result.count } });
}
