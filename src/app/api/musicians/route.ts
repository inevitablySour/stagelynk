import { NextResponse } from "next/server";
import { discoverArtists } from "@/lib/discovery";
import { discoveryQuerySchema } from "@/lib/discovery-utils";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = discoveryQuerySchema.safeParse({
    ...Object.fromEntries(searchParams),
    genre: searchParams.getAll("genre"),
    category: searchParams.getAll("category"),
  });
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid discovery filters" }, { status: 400 });
  }
  if (parsed.data.category.length) {
    const validCount = await prisma.categorySubtype.count({ where: { slug: { in: parsed.data.category } } });
    if (validCount !== new Set(parsed.data.category).size) {
      return NextResponse.json({ success: false, message: "Invalid discovery filters" }, { status: 400 });
    }
  }
  return NextResponse.json({ success: true, data: await discoverArtists(parsed.data) });
}
