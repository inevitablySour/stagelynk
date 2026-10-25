import { NextResponse } from "next/server";
import { z } from "zod/v4";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit-log";
import { EQUIPMENT_GROUP_KEYS } from "@/lib/equipment-catalog/groups";

const STATUSES = ["active", "pending", "rejected", "hidden", "retired"] as const;
const SOURCES = ["custom", "shopify", "wikidata"] as const;

const listQuery = z.object({
  q: z.string().trim().max(120).default(""),
  status: z.enum(STATUSES).optional(),
  source: z.enum(SOURCES).optional(),
  group: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(500).default(50),
});

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const parsed = listQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid filters" }, { status: 400 });
  const { q, status, source, group, page, pageSize } = parsed.data;

  const where: Prisma.EquipmentItemWhereInput = {
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    ...(group ? { group } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] } : {}),
  };

  const [items, total, statusCounts, sourceCounts, categories] = await Promise.all([
    prisma.equipmentItem.findMany({
      where,
      orderBy: [{ group: "asc" }, { category: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { musicianNeeds: true, musicianOwned: true, venueOfferings: true } } },
    }),
    prisma.equipmentItem.count({ where }),
    prisma.equipmentItem.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.equipmentItem.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.equipmentItem.findMany({ distinct: ["group", "category"], select: { group: true, category: true }, orderBy: { category: "asc" } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      items: items.map(({ _count, ...item }) => ({ ...item, usage: _count.musicianNeeds + _count.musicianOwned + _count.venueOfferings })),
      total,
      page,
      pageSize,
      categories,
      counts: {
        status: Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all])),
        source: Object.fromEntries(sourceCounts.map((s) => [s.source, s._count._all])),
      },
    },
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  group: z.enum(EQUIPMENT_GROUP_KEYS as [string, ...string[]]),
  kind: z.enum(["hardware", "software"]),
  description: z.string().trim().max(300).optional(),
});

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Check the item's name, category and group." }, { status: 400 });

  const base = `custom-${slugify(parsed.data.name)}`;
  const taken = await prisma.equipmentItem.count({ where: { slug: { startsWith: base } } });
  const item = await prisma.equipmentItem.create({
    data: { ...parsed.data, slug: taken ? `${base}-${taken + 1}` : base, source: "custom", status: "active", addedManually: true },
  });

  await writeAuditLog({ event: "equipment_item_created", category: "admin", actorUserId: session.user.id, targetType: "EquipmentItem", targetId: item.id, metadata: { name: item.name } });
  return NextResponse.json({ success: true, data: item });
}
