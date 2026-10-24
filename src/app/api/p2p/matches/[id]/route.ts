import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!me) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const { id } = await params;
  const match = await prisma.p2PMatch.findUnique({ where: { id } });
  if (!match || (match.musicianAId !== me.id && match.musicianBId !== me.id)) {
    return NextResponse.json({ success: false, message: "Match not found" }, { status: 404 });
  }
  if (match.initiatedBy === me.id) {
    return NextResponse.json({ success: false, message: "You can't respond to your own match request." }, { status: 400 });
  }
  if (match.status !== "pending") {
    return NextResponse.json({ success: false, message: "This match has already been responded to." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
  }

  if (parsed.data.action === "decline") {
    const updated = await prisma.p2PMatch.update({
      where: { id },
      data: { status: "declined", respondedAt: new Date() },
    });
    return NextResponse.json({ success: true, data: updated });
  }

  const result = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({ data: { kind: "p2p_match" } });
    await tx.conversationParticipant.createMany({
      data: [
        { conversationId: conversation.id, musicianId: match.musicianAId },
        { conversationId: conversation.id, musicianId: match.musicianBId },
      ],
    });
    return tx.p2PMatch.update({
      where: { id },
      data: { status: "mutual", respondedAt: new Date(), conversationId: conversation.id },
    });
  });

  return NextResponse.json({ success: true, data: result });
}
