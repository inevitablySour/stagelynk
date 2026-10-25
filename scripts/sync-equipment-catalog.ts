// Usage: npx tsx scripts/sync-equipment-catalog.ts --source shopify|wikidata [--apply]
// Without --apply this only previews (validates + diffs, writes nothing to the
// catalog). The same flow is available to admins at /admin/equipment.
import { prisma } from "../src/lib/db";
import { applySyncRun, previewSync, type SyncSource, type SyncSummary } from "../src/lib/equipment-catalog/sync";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function print(summary: SyncSummary) {
  const { counts } = summary;
  console.log(`  candidates ${counts.candidates} · added ${counts.added} · updated ${counts.updated} · retired ${counts.retired} · unchanged ${counts.unchanged}`);
  for (const a of summary.added.slice(0, 15)) console.log(`  + ${a.name} (${a.category})`);
  if (summary.added.length > 15) console.log(`  … and ${summary.added.length - 15} more additions`);
  for (const u of summary.updated.slice(0, 10)) console.log(`  ~ ${u.name}: ${u.fields.join(", ")}${u.revived ? " (revived)" : ""}`);
  for (const r of summary.retired.slice(0, 10)) console.log(`  - ${r.name}`);
}

async function main() {
  const source = arg("source") as SyncSource | undefined;
  if (source !== "shopify" && source !== "wikidata") throw new Error("Pass --source shopify or --source wikidata");

  const run = await previewSync(source);
  if (run.status === "failed") throw new Error(run.error ?? "Preview failed");
  console.log(`Preview ${run.id} (${source} ${run.version}):`);
  print(run.summary as unknown as SyncSummary);

  if (!process.argv.includes("--apply")) {
    console.log("\nPreview only. Re-run with --apply to write these changes.");
    return;
  }
  console.log("\nApplying…");
  print(await applySyncRun(run.id));
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
