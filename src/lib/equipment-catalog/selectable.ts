import { prisma } from "@/lib/db";

/**
 * Returns an error message if `ids` can't be saved, else null. New selections
 * must be active catalog items;
 * items already on the record may stay even if later retired or hidden.
 */
export async function invalidEquipmentSelection(
  ids: string[],
  options: { previouslySelected?: string[] } = {}
): Promise<string | null> {
  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) return "Each item can only be listed once.";
  if (!unique.length) return null;

  const items = await prisma.equipmentItem.findMany({ where: { id: { in: unique } }, select: { id: true, status: true, kind: true } });
  if (items.length !== unique.length) return "Choose equipment from the catalog.";

  const kept = new Set(options.previouslySelected ?? []);
  for (const item of items) {
    if (kept.has(item.id)) continue;
    if (item.status !== "active") return "One of the selected items is no longer available. Remove it and try again.";
  }
  return null;
}
