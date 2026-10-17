import { NextResponse } from "next/server";
import { discoverArtists } from "@/lib/discovery";
import { discoveryQuerySchema, normalizeCategory } from "@/lib/discovery-utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = discoveryQuerySchema.safeParse({
    ...Object.fromEntries(searchParams),
    genre: searchParams.getAll("genre"),
    category: searchParams.getAll("category"),
  });
  if (!parsed.success || parsed.data.category.some((value) => !normalizeCategory(value))) {
    return NextResponse.json({ success: false, message: "Invalid discovery filters" }, { status: 400 });
  }
  return NextResponse.json({ success: true, data: await discoverArtists(parsed.data) });
}
