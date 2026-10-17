import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(_: Request, { params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Musician profile not found" }, { status: 404 });
  }

  const album = await prisma.album.findUnique({ where: { id: albumId } });
  if (!album || album.musicianId !== musician.id) {
    return NextResponse.json({ success: false, message: "Album not found" }, { status: 404 });
  }

  await prisma.album.delete({ where: { id: albumId } });

  return NextResponse.json({ success: true });
}
