import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const participantRows = await prisma.conversationParticipant.findMany({
    where: { musicianId: musician.id },
    include: {
      conversation: {
        include: {
          participants: {
            where: { musicianId: { not: musician.id } },
            include: { musician: { select: { id: true, stageName: true, profileImage: true } } },
          },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
  });

  const data = await Promise.all(
    participantRows.map(async (row) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: row.conversationId,
          senderId: { not: musician.id },
          createdAt: row.lastReadAt ? { gt: row.lastReadAt } : undefined,
        },
      });

      const other = row.conversation.participants[0]?.musician ?? null;
      const lastMessage = row.conversation.messages[0] ?? null;

      return {
        id: row.conversationId,
        otherMusician: other,
        lastMessage: lastMessage ? { body: lastMessage.body, createdAt: lastMessage.createdAt } : null,
        lastMessageAt: row.conversation.lastMessageAt,
        unreadCount,
      };
    })
  );

  return NextResponse.json({ success: true, data });
}
