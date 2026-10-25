import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const patchSchema = z.object({ status: z.enum(["published", "closed"]) });

async function ownCall(id: string, userId: string) {
  const me = await prisma.musicianProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!me) return null;
  return prisma.artistOpenCall.findFirst({ where: { id, posterId: me.id }, select: { id: true } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await ownCall(id, session.user.id))) return NextResponse.json({ success: false, message: "Open call not found" }, { status: 404 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
  const updated = await prisma.artistOpenCall.update({ where: { id }, data: { status: parsed.data.status }, select: { id: true, status: true } });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await ownCall(id, session.user.id))) return NextResponse.json({ success: false, message: "Open call not found" }, { status: 404 });
  await prisma.artistOpenCall.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
