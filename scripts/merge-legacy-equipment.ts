// One-time: moves references from the original hand-written equipment items
// onto their Shopify equivalents, then retires the originals. Safe to re-run.
// Requires the Shopify catalog to have been synced first.
// Usage: npx tsx scripts/merge-legacy-equipment.ts [--confirm]
import { prisma } from "../src/lib/db";
import { LEGACY_EQUIPMENT_MERGES } from "../src/config";

async function main() {
  const confirm = process.argv.includes("--confirm");
  for (const [legacySlug, targetSlug] of Object.entries(LEGACY_EQUIPMENT_MERGES)) {
    const legacy = await prisma.equipmentItem.findUnique({ where: { slug: legacySlug } });
    const target = await prisma.equipmentItem.findUnique({ where: { slug: targetSlug } });
    if (!legacy) { console.log(`skip ${legacySlug}: not present`); continue; }
    if (!target || target.status !== "active") throw new Error(`Target ${targetSlug} is missing or inactive; sync Shopify first.`);
    if (legacy.status === "retired") { console.log(`skip ${legacySlug}: already merged`); continue; }

    const [needs, owned, offerings] = await Promise.all([
      prisma.musicianEquipmentNeed.findMany({ where: { equipmentId: legacy.id } }),
      prisma.musicianEquipmentOwned.findMany({ where: { equipmentId: legacy.id } }),
      prisma.venueEquipmentOffering.findMany({ where: { equipmentId: legacy.id } }),
    ]);
    console.log(`${legacySlug} -> ${target.name}: ${needs.length} needs, ${owned.length} owned, ${offerings.length} venue offerings`);
    if (!confirm) continue;

    await prisma.$transaction(async (tx) => {
      // If the profile already lists the target, keep the larger quantity and drop the legacy row.
      for (const row of needs) {
        const clash = await tx.musicianEquipmentNeed.findUnique({ where: { musicianId_equipmentId: { musicianId: row.musicianId, equipmentId: target.id } } });
        if (clash) {
          await tx.musicianEquipmentNeed.update({ where: { id: clash.id }, data: { quantity: Math.max(clash.quantity, row.quantity) } });
          await tx.musicianEquipmentNeed.delete({ where: { id: row.id } });
        } else await tx.musicianEquipmentNeed.update({ where: { id: row.id }, data: { equipmentId: target.id } });
      }
      for (const row of owned) {
        const clash = await tx.musicianEquipmentOwned.findUnique({ where: { musicianId_equipmentId: { musicianId: row.musicianId, equipmentId: target.id } } });
        if (clash) {
          await tx.musicianEquipmentOwned.update({ where: { id: clash.id }, data: { quantity: Math.max(clash.quantity, row.quantity) } });
          await tx.musicianEquipmentOwned.delete({ where: { id: row.id } });
        } else await tx.musicianEquipmentOwned.update({ where: { id: row.id }, data: { equipmentId: target.id } });
      }
      for (const row of offerings) {
        const clash = await tx.venueEquipmentOffering.findUnique({ where: { venueId_equipmentId: { venueId: row.venueId, equipmentId: target.id } } });
        if (clash) {
          await tx.venueEquipmentOffering.update({ where: { id: clash.id }, data: { quantity: Math.max(clash.quantity, row.quantity) } });
          await tx.venueEquipmentOffering.delete({ where: { id: row.id } });
        } else await tx.venueEquipmentOffering.update({ where: { id: row.id }, data: { equipmentId: target.id } });
      }
      await tx.equipmentItem.update({ where: { id: legacy.id }, data: { status: "retired" } });
    });
  }
  if (!confirm) console.log("\nDry run. Re-run with --confirm to merge.");
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
