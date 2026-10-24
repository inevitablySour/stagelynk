"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ConversationRow {
  id: string;
  otherMusician: { id: string; stageName: string; profileImage: string | null } | null;
  lastMessage: { body: string; createdAt: string } | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export function ConversationList({
  conversations,
  activeId,
}: {
  conversations: ConversationRow[];
  activeId?: string;
}) {
  if (conversations.length === 0) {
    return (
      <div className="empty-state">
        <MessageCircle className="mx-auto h-8 w-8 text-stone-400" />
        <p className="mt-3 text-sm text-stone-500">
          No conversations yet. Match with another artist to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((c) => (
        <Link
          key={c.id}
          href={`/musician/p2p/messages?c=${c.id}`}
          className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
            activeId === c.id ? "border-brand bg-brand-soft" : "border-stone-100 hover:bg-stone-50"
          }`}
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-stone-900">{c.otherMusician?.stageName ?? "Unknown artist"}</p>
            {c.lastMessage && <p className="truncate text-sm text-stone-500">{c.lastMessage.body}</p>}
          </div>
          {c.unreadCount > 0 && <Badge variant="success">{c.unreadCount}</Badge>}
        </Link>
      ))}
    </div>
  );
}
