import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  targetMusicianId: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!me) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const matches = await prisma.p2PMatch.findMany({
    where: { OR: [{ musicianAId: me.id }, { musicianBId: me.id }] },
    include: {
      musicianA: { select: { id: true, stageName: true, profileImage: true } },
      musicianB: { select: { id: true, stageName: true, profileImage: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const data = matches.map((m) => {
    const other = m.musicianAId === me.id ? m.musicianB : m.musicianA;
    const isInitiator = m.initiatedBy === me.id;
    return {
      id: m.id,
      status: m.status,
      otherMusician: other,
      isInitiator,
      conversationId: m.conversationId,
      createdAt: m.createdAt,
    };
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!me) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
  }

  const { targetMusicianId } = parsed.data;
  if (targetMusicianId === me.id) {
    return NextResponse.json({ success: false, message: "You can't match with yourself." }, { status: 400 });
  }

  const target = await prisma.musicianProfile.findUnique({ where: { id: targetMusicianId, user: { deletedAt: null } } });
  if (!target) {
    return NextResponse.json({ success: false, message: "Musician not found." }, { status: 404 });
  }

  const [musicianAId, musicianBId] = [me.id, targetMusicianId].sort();

  const existing = await prisma.p2PMatch.findUnique({
    where: { musicianAId_musicianBId: { musicianAId, musicianBId } },
  });

  if (existing) {
    if (existing.status === "mutual") {
      return NextResponse.json({ success: true, data: existing });
    }
    if (existing.initiatedBy === me.id) {
      return NextResponse.json({ success: true, data: existing });
    }

    // The other side already liked us — this flips it to mutual and opens a conversation.
    const result = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({ data: { kind: "p2p_match" } });
      await tx.conversationParticipant.createMany({
        data: [
          { conversationId: conversation.id, musicianId: musicianAId },
          { conversationId: conversation.id, musicianId: musicianBId },
        ],
      });
      return tx.p2PMatch.update({
        where: { id: existing.id },
        data: { status: "mutual", respondedAt: new Date(), conversationId: conversation.id },
      });
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  }

  const created = await prisma.p2PMatch.create({
    data: { musicianAId, musicianBId, initiatedBy: me.id, status: "pending" },
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
