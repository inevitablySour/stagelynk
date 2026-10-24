import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ConversationList, type ConversationRow } from "@/components/p2p/conversation-list";
import { MessageThread } from "@/components/p2p/message-thread";
import { DealsPanel } from "@/components/p2p/deals-panel";

export default async function P2PMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) redirect("/onboarding/role");

  const { c: activeConversationId } = await searchParams;

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

  const conversations: ConversationRow[] = await Promise.all(
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
        lastMessage: lastMessage ? { body: lastMessage.body, createdAt: lastMessage.createdAt.toISOString() } : null,
        lastMessageAt: row.conversation.lastMessageAt?.toISOString() ?? null,
        unreadCount,
      };
    })
  );

  const active = conversations.find((c) => c.id === activeConversationId) ?? conversations[0] ?? null;

  const activeMatch = active
    ? await prisma.p2PMatch.findUnique({ where: { conversationId: active.id } })
    : null;

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <div className="flex-1 lg:pl-0">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">Messages</h1>
            <p className="mt-1 text-stone-500">Chat with artists you&apos;ve matched with.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <Card className="lg:col-span-1">
              <CardContent className="p-3">
                <ConversationList conversations={conversations} activeId={active?.id} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 h-[32rem]">
              <CardContent className="h-full p-0">
                {active ? (
                  <MessageThread
                    conversationId={active.id}
                    currentMusicianId={musician.id}
                    otherStageName={active.otherMusician?.stageName ?? "Unknown artist"}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-stone-400">
                    <MessageCircle className="h-8 w-8" />
                    <p className="mt-2 text-sm">Select a conversation to start chatting.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-1">
              {active && activeMatch && (
                <DealsPanel
                  matchId={activeMatch.id}
                  otherMusicianId={active.otherMusician?.id ?? ""}
                  currentMusicianId={musician.id}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
