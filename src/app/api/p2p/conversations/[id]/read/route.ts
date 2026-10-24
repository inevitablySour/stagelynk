import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const updated = await prisma.conversationParticipant.updateMany({
    where: { conversationId: id, musicianId: musician.id },
    data: { lastReadAt: new Date() },
  });

  if (updated.count === 0) {
    return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
