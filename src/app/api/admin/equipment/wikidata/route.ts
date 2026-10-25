import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { CatalogValidationError } from "@/lib/equipment-catalog/shopify";
import { fetchWikidataEntity, searchWikidata, wikidataCandidateFor } from "@/lib/equipment-catalog/wikidata";

/** Search Wikidata, marking results already in the catalog. */
export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 120) return NextResponse.json({ success: true, data: [] });

  try {
    const results = await searchWikidata(q);
    const existing = await prisma.equipmentItem.findMany({
      where: { source: "wikidata", externalId: { in: results.map((r) => r.qid) } },
      select: { externalId: true, status: true },
    });
    const statusByQid = new Map(existing.map((e) => [e.externalId, e.status]));
    return NextResponse.json({ success: true, data: results.map((r) => ({ ...r, catalogStatus: statusByQid.get(r.qid) ?? null })) });
  } catch {
    return NextResponse.json({ success: false, message: "Wikidata search is unavailable right now." }, { status: 502 });
  }
}

const importSchema = z.object({
  qid: z.string().regex(/^Q\d+$/),
  category: z.string().trim().min(2).max(80),
});

/** One-off import of a specific product; it goes live immediately and is never retired by a sync. */
export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const parsed = importSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Choose a Wikidata item and a category." }, { status: 400 });

  try {
    const entity = await fetchWikidataEntity(parsed.data.qid);
    const candidate = wikidataCandidateFor(entity, parsed.data.category);
    const item = await prisma.equipmentItem.upsert({
      where: { source_externalId: { source: "wikidata", externalId: candidate.externalId } },
      create: { ...candidate, source: "wikidata", status: "active", addedManually: true, adminLocked: true, lastSyncedAt: new Date() },
      update: { status: "active", category: candidate.category, addedManually: true, adminLocked: true },
    });
    await writeAuditLog({ event: "equipment_item_imported", category: "admin", actorUserId: session.user.id, targetType: "EquipmentItem", targetId: item.id, metadata: { qid: candidate.externalId } });
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    const message = error instanceof CatalogValidationError ? error.message : "Couldn't reach Wikidata. Try again shortly.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
