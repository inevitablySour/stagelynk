"use client";

import Link from "next/link";
import { useState } from "react";
import { Handshake, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "none" | "pending" | "mutual";

export function CollaborateButton({ musicianId, stageName, initialStatus = "none", conversationId = null }: {
  musicianId: string; stageName: string; initialStatus?: Status; conversationId?: string | null;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [conversation, setConversation] = useState(conversationId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request() {
    setBusy(true); setError(null);
    try {
      const json = await (await fetch("/api/p2p/matches", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetMusicianId: musicianId }),
      })).json();
      if (!json.success) { setError(json.message ?? "Couldn't send your request."); return; }
      setStatus(json.data.status === "mutual" ? "mutual" : "pending");
      setConversation(json.data.conversationId ?? null);
    } catch { setError("Couldn't send your request right now."); } finally { setBusy(false); }
  }

  if (status === "mutual") {
    return <Button className="w-full" asChild><Link href={conversation ? `/musician/p2p/messages?c=${conversation}` : "/musician/p2p/messages"}><MessageCircle className="mr-2 h-4 w-4" />You&apos;re matched · message {stageName}</Link></Button>;
  }
  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={request} disabled={busy || status === "pending"}>
        <Handshake className="mr-2 h-4 w-4" />{status === "pending" ? "Request sent" : busy ? "Sending…" : "Match to collaborate"}
      </Button>
      {status === "pending" && <p className="text-xs text-muted">{stageName} will see your request under Collaborate. You can chat once they accept.</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
