import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit-log";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const updated = await prisma.promotionCampaign.updateMany({
    where: { id, status: "draft", venue: { userId: session.user.id, user: { deletedAt: null } } },
    data: { status: "cancelled" },
  });
  if (!updated.count) return NextResponse.json({ success: false, message: "Draft not found, or this campaign is no longer a draft." }, { status: 404 });
  await writeAuditLog({ event: "promotion_draft_cancel", category: "promotion", level: "info", actorUserId: session.user.id, targetType: "PromotionCampaign", targetId: id });
  return NextResponse.json({ success: true });
}
