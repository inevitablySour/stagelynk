import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { broadcastMessage } from "@/lib/supabase-admin";
import { getLogger } from "@/lib/logger";

const log = getLogger("api-p2p-messages");

const bodySchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

async function requireParticipant(conversationId: string, userId: string) {
  const musician = await prisma.musicianProfile.findUnique({ where: { userId } });
  if (!musician) return { musician: null, participant: null };

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_musicianId: { conversationId, musicianId: musician.id } },
  });

  return { musician, participant };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { participant } = await requireParticipant(id, session.user.id);
  if (!participant) {
    return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
  }

  const after = request.nextUrl.searchParams.get("after");
  const messages = await prisma.message.findMany({
    where: {
      conversationId: id,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({ success: true, data: messages });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { musician, participant } = await requireParticipant(id, session.user.id);
  if (!musician || !participant) {
    return NextResponse.json({ success: false, message: "Conversation not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Message cannot be empty." }, { status: 400 });
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: { conversationId: id, senderId: musician.id, body: parsed.data.body },
    });
    await tx.conversation.update({ where: { id }, data: { lastMessageAt: created.createdAt } });
    return created;
  });

  broadcastMessage(id, message).catch((err) => log.error({ err }, "Failed to broadcast P2P message"));

  return NextResponse.json({ success: true, data: message }, { status: 201 });
}
