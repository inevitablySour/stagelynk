import type { EquipmentItem, EquipmentSource, EquipmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit-log";
import type { CatalogCandidate } from "@/lib/equipment-catalog/groups";
import { CatalogValidationError, fetchShopifyCandidates } from "@/lib/equipment-catalog/shopify";
import { fetchWikidataCandidates } from "@/lib/equipment-catalog/wikidata";

export type SyncSource = Extract<EquipmentSource, "shopify" | "wikidata">;

const STALE_PREVIEW_MS = 24 * 60 * 60 * 1000;
// Refuse a sync that would retire more than half the currently offered items:
// that pattern means a broken download, not a real taxonomy change.
const MAX_RETIRE_FRACTION = 0.5;

interface ItemChange {
  externalId: string;
  id: string;
  name: string;
  fields: string[];
  before: Record<string, string | null>;
  after: Record<string, string | null>;
  revived: boolean;
}

export interface SyncDiff {
  added: { externalId: string; name: string; category: string; group: string }[];
  updated: ItemChange[];
  retired: { id: string; externalId: string; name: string }[];
  unchanged: number;
}

export interface SyncSummary {
  counts: { added: number; updated: number; retired: number; unchanged: number; candidates: number };
  added: SyncDiff["added"];
  updated: Pick<ItemChange, "name" | "fields" | "before" | "after" | "revived">[];
  retired: { name: string }[];
}

const SYNCED_FIELDS = ["name", "category", "group", "path", "description", "kind"] as const;
const LOCKABLE_FIELDS = new Set(["name", "category", "group"]);

/** Status a newly seen (or reappearing) item starts in. Named software is reviewed first. */
function entryStatus(source: SyncSource): EquipmentStatus {
  return source === "wikidata" ? "pending" : "active";
}

export function computeDiff(source: SyncSource, candidates: CatalogCandidate[], existing: EquipmentItem[]): SyncDiff {
  const byExternal = new Map(existing.filter((e) => e.externalId).map((e) => [e.externalId!, e]));
  const seen = new Set<string>();
  const diff: SyncDiff = { added: [], updated: [], retired: [], unchanged: 0 };

  for (const c of candidates) {
    seen.add(c.externalId);
    const item = byExternal.get(c.externalId);
    if (!item) {
      diff.added.push({ externalId: c.externalId, name: c.name, category: c.category, group: c.group });
      continue;
    }
    const fields = SYNCED_FIELDS.filter((f) => !(item.adminLocked && LOCKABLE_FIELDS.has(f)) && (item[f] ?? null) !== (c[f] ?? null));
    const revived = item.status === "retired";
    if (!fields.length && !revived) {
      diff.unchanged += 1;
      continue;
    }
    diff.updated.push({
      externalId: c.externalId, id: item.id, name: item.name, fields: [...fields], revived,
      before: Object.fromEntries(fields.map((f) => [f, (item[f] as string | null) ?? null])),
      after: Object.fromEntries(fields.map((f) => [f, (c[f] as string | null) ?? null])),
    });
  }

  for (const item of existing) {
    // Admin-imported items, and items an admin hid or rejected, are never
    // retired by a sync.
    if (item.addedManually || !item.externalId || seen.has(item.externalId)) continue;
    if (item.status === "active" || item.status === "pending") diff.retired.push({ id: item.id, externalId: item.externalId, name: item.name });
  }
  return diff;
}

function summarize(diff: SyncDiff, candidateCount: number): SyncSummary {
  return {
    counts: { added: diff.added.length, updated: diff.updated.length, retired: diff.retired.length, unchanged: diff.unchanged, candidates: candidateCount },
    added: diff.added,
    updated: diff.updated.map(({ name, fields, before, after, revived }) => ({ name, fields, before, after, revived })),
    retired: diff.retired.map(({ name }) => ({ name })),
  };
}

async function loadExisting(source: SyncSource) {
  return prisma.equipmentItem.findMany({ where: { source } });
}

function assertSafeRetirement(source: SyncSource, diff: SyncDiff, existing: EquipmentItem[]) {
  const offered = existing.filter((e) => !e.addedManually && (e.status === "active" || e.status === "pending")).length;
  if (offered >= 20 && diff.retired.length > offered * MAX_RETIRE_FRACTION) {
    throw new CatalogValidationError(
      `This ${source} sync would retire ${diff.retired.length} of ${offered} items. That looks like a bad download rather than a real change, so nothing was saved.`
    );
  }
}

async function fetchCandidates(source: SyncSource) {
  return source === "shopify" ? fetchShopifyCandidates() : fetchWikidataCandidates();
}

/** Fetches, validates and diffs a source without touching the catalog. */
export async function previewSync(source: SyncSource, actorUserId?: string) {
  try {
    const { version, candidates } = await fetchCandidates(source);
    const existing = await loadExisting(source);
    const diff = computeDiff(source, candidates, existing);
    assertSafeRetirement(source, diff, existing);
    return prisma.equipmentSyncRun.create({
      data: {
        source, version, createdById: actorUserId,
        candidates: candidates as unknown as Prisma.InputJsonValue,
        summary: summarize(diff, candidates.length) as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    const message = error instanceof CatalogValidationError ? error.message : `Sync preview failed: ${(error as Error).message}`;
    return prisma.equipmentSyncRun.create({ data: { source, status: "failed", error: message, createdById: actorUserId } });
  }
}

export class SyncApplyError extends Error {}

/**
 * Applies a previewed run using the exact candidate list the admin reviewed.
 * The diff is recomputed against the current catalog so edits made since the
 * preview (approvals, renames) are respected rather than overwritten.
 */
export async function applySyncRun(runId: string, actorUserId?: string) {
  const run = await prisma.equipmentSyncRun.findUnique({ where: { id: runId } });
  if (!run) throw new SyncApplyError("Sync run not found.");
  if (run.status !== "previewed") throw new SyncApplyError("Only a fresh preview can be applied.");
  if (Date.now() - run.createdAt.getTime() > STALE_PREVIEW_MS) throw new SyncApplyError("This preview is more than a day old. Run a new preview first.");
  const newer = await prisma.equipmentSyncRun.findFirst({ where: { source: run.source, status: "applied", appliedAt: { gt: run.createdAt } } });
  if (newer) throw new SyncApplyError("A newer sync was applied after this preview. Run a new preview first.");

  const source = run.source as SyncSource;
  const candidates = run.candidates as unknown as CatalogCandidate[];
  const existing = await loadExisting(source);
  const diff = computeDiff(source, candidates, existing);
  assertSafeRetirement(source, diff, existing);
  const byExternal = new Map(candidates.map((c) => [c.externalId, c]));
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (diff.added.length) {
      await tx.equipmentItem.createMany({
        data: diff.added.map(({ externalId }) => {
          const c = byExternal.get(externalId)!;
          return { ...c, source, status: entryStatus(source), lastSyncedAt: now };
        }),
        skipDuplicates: true,
      });
    }
    for (const change of diff.updated) {
      const c = byExternal.get(change.externalId)!;
      await tx.equipmentItem.update({
        where: { id: change.id },
        data: {
          ...Object.fromEntries(change.fields.map((f) => [f, c[f as keyof CatalogCandidate]])),
          ...(change.revived ? { status: entryStatus(source) } : {}),
          lastSyncedAt: now,
        },
      });
    }
    if (diff.retired.length) {
      await tx.equipmentItem.updateMany({ where: { id: { in: diff.retired.map((r) => r.id) } }, data: { status: "retired", lastSyncedAt: now } });
    }
    const untouched = candidates.map((c) => c.externalId).filter((id) => !diff.added.some((a) => a.externalId === id) && !diff.updated.some((u) => u.externalId === id));
    if (untouched.length) await tx.equipmentItem.updateMany({ where: { source, externalId: { in: untouched } }, data: { lastSyncedAt: now } });
    await tx.equipmentSyncRun.update({
      where: { id: run.id },
      data: { status: "applied", appliedAt: now, summary: summarize(diff, candidates.length) as unknown as Prisma.InputJsonValue },
    });
  }, { timeout: 60_000 });

  await writeAuditLog({
    event: "equipment_catalog_synced",
    category: "admin",
    level: "info",
    actorUserId,
    targetType: "EquipmentSyncRun",
    targetId: run.id,
    metadata: { source, version: run.version, added: diff.added.length, updated: diff.updated.length, retired: diff.retired.length },
  });

  return summarize(diff, candidates.length);
}
