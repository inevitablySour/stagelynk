import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { listOpenCalls } from "@/lib/open-calls";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = z.object({
    q: z.string().trim().max(120).optional(), genre: z.string().max(80).optional(),
    subgenre: z.string().trim().max(80).optional(),
    minBudget: z.coerce.number().min(0).max(1000000).optional(),
    maxBudget: z.coerce.number().min(0).max(1000000).optional(),
    technicalFit: z.enum(["true", "false"]).optional(),
  }).safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid open-call filters" }, { status: 400 });
  if (parsed.data.minBudget !== undefined && parsed.data.maxBudget !== undefined && parsed.data.minBudget > parsed.data.maxBudget) return NextResponse.json({ success: false, message: "Minimum compensation cannot exceed maximum compensation." }, { status: 400 });
  const session = await auth();
  const artist = session?.user?.role === "musician" ? await prisma.musicianProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } }, select: { id: true } }) : null;
  if (parsed.data.technicalFit === "true" && !artist) return NextResponse.json({ success: false, message: "Sign in as a creative to match your technical rider." }, { status: 401 });
  return NextResponse.json({ success: true, data: await listOpenCalls({ ...parsed.data, technicalFit: parsed.data.technicalFit === "true" }, artist?.id) });
}
