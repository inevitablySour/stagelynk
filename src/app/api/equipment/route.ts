import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Hidden and retired items are returned (flagged) only so that existing
// selections keep rendering; pickers don't offer them for new selections.
export async function GET() {
  const items = await prisma.equipmentItem.findMany({
    where: { status: { in: ["active", "hidden", "retired"] } },
    select: { id: true, name: true, slug: true, category: true, group: true, kind: true, status: true },
    orderBy: [{ group: "asc" }, { category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ success: true, data: items });
}
