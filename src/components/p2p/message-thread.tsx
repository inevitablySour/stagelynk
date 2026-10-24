"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabaseClient } from "@/lib/supabase-client";

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export function MessageThread({
  conversationId,
  currentMusicianId,
  otherStageName,
}: {
  conversationId: string;
  currentMusicianId: string;
  otherStageName: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await fetch(`/api/p2p/conversations/${conversationId}/messages`);
      const json = await res.json();
      if (!cancelled && json.success) setMessages(json.data);
      fetch(`/api/p2p/conversations/${conversationId}/read`, { method: "POST" }).catch(() => {});
    })();

    const channel = supabaseClient
      .channel(`conversation:${conversationId}`)
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setMessages((prev) => (prev.some((m) => m.id === (payload as Message).id) ? prev : [...prev, payload as Message]));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabaseClient.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/p2p/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => (prev.some((m) => m.id === json.data.id) ? prev : [...prev, json.data]));
        setDraft("");
      } else {
        setError(json.message ?? "Couldn't send that message.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-stone-100 p-4">
        <h3 className="font-semibold text-stone-900">{otherStageName}</h3>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === currentMusicianId ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                m.senderId === currentMusicianId ? "bg-brand text-white" : "bg-stone-100 text-stone-900"
              }`}
            >
              {m.body}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {error && <p className="px-4 text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2 border-t border-stone-100 p-4">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Write a message…"
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !draft.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
