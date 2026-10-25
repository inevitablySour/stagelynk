import { test } from "node:test";
import assert from "node:assert/strict";
import type { EquipmentItem } from "@prisma/client";
import { computeDiff } from "../src/lib/equipment-catalog/sync";
import { CatalogValidationError, selectShopifyCandidates } from "../src/lib/equipment-catalog/shopify";
import type { CatalogCandidate } from "../src/lib/equipment-catalog/groups";

const candidate = (id: string, name: string, extra: Partial<CatalogCandidate> = {}): CatalogCandidate => ({
  externalId: id, name, slug: `s-${id}`, group: "live-sound", category: "Core audio", kind: "hardware", path: `A > ${name}`, description: null, ...extra,
});

const item = (id: string, name: string, extra: Partial<EquipmentItem> = {}): EquipmentItem => ({
  id: `db-${id}`, externalId: id, name, slug: `s-${id}`, group: "live-sound", category: "Core audio", kind: "hardware", path: `A > ${name}`,
  description: null, source: "shopify", status: "active", adminLocked: false, addedManually: false, lastSyncedAt: null,
  createdAt: new Date(), updatedAt: new Date(), ...extra,
});

test("sync diff adds new, updates changed, and retires items missing from the source", () => {
  const diff = computeDiff("shopify", [candidate("a", "Mixers"), candidate("b", "Microphones (new name)")], [item("b", "Microphones"), item("c", "Old Thing")]);
  assert.deepEqual(diff.added.map((a) => a.externalId), ["a"]);
  assert.deepEqual(diff.updated.map((u) => [u.externalId, u.fields]), [["b", ["name", "path"]]]);
  assert.deepEqual(diff.retired.map((r) => r.externalId), ["c"]);
});

test("admin edits survive syncs and manual or rejected items are never retired", () => {
  const diff = computeDiff("wikidata", [candidate("a", "Renamed upstream", { category: "Upstream" })], [
    item("a", "Admin name", { adminLocked: true, category: "Admin category" }),
    item("m", "Manual import", { addedManually: true }),
    item("r", "Rejected", { status: "rejected" }),
    item("h", "Hidden", { status: "hidden" }),
  ]);
  assert.equal(diff.updated.length, 1);
  assert.deepEqual(diff.updated[0].fields, ["path"]);
  assert.equal(diff.retired.length, 0);
});

test("items that return to the source are revived and an unchanged catalog is a no-op", () => {
  const revived = computeDiff("shopify", [candidate("a", "Mixers")], [item("a", "Mixers", { status: "retired" })]);
  assert.equal(revived.updated[0].revived, true);
  const same = computeDiff("shopify", [candidate("a", "Mixers")], [item("a", "Mixers")]);
  assert.deepEqual([same.added.length, same.updated.length, same.retired.length, same.unchanged], [0, 0, 0, 1]);
});

test("Shopify selection rejects incomplete or unexpected downloads", () => {
  assert.throws(() => selectShopifyCandidates({ version: "", verticals: [] }), CatalogValidationError);
  assert.throws(() => selectShopifyCandidates({ version: "2026-08", verticals: [] }), /verticals/);
  const tooSmall = { version: "2026-08", verticals: Array.from({ length: 26 }, (_, i) => ({ name: `V${i}`, categories: [] })) };
  assert.throws(() => selectShopifyCandidates(tooSmall), /categories parsed/);
});
