import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { previewSync } from "@/lib/equipment-catalog/sync";

// Wikidata's eight class queries can take ~15s.
export const maxDuration = 120;

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const runs = await prisma.equipmentSyncRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, source: true, status: true, version: true, summary: true, error: true, createdAt: true, appliedAt: true },
  });
  return NextResponse.json({ success: true, data: runs });
}

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const parsed = z.object({ source: z.enum(["shopify", "wikidata"]) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Choose a sync source." }, { status: 400 });

  const { id, source, status, version, summary, error, createdAt } = await previewSync(parsed.data.source, session.user.id);
  return NextResponse.json({ success: status !== "failed", message: error ?? undefined, data: { id, source, status, version, summary, error, createdAt } });
}
