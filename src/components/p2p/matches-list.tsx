"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface MatchRow {
  id: string;
  status: "pending" | "mutual" | "declined";
  otherMusician: { id: string; stageName: string; profileImage: string | null };
  isInitiator: boolean;
  conversationId: string | null;
}

export function MatchesList({ matches }: { matches: MatchRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(matches);
  const [busyId, setBusyId] = useState<string | null>(null);

  const respond = async (id: string, action: "accept" | "decline") => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/p2p/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        setRows((prev) => prev.map((m) => (m.id === id ? { ...m, ...json.data } : m)));
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <p className="text-sm text-stone-500">No matches yet. Like some suggestions to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((m) => (
        <Card key={m.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-stone-900">{m.otherMusician.stageName}</p>
              <Badge variant={m.status === "mutual" ? "success" : m.status === "declined" ? "destructive" : "warning"}>
                {m.status === "pending" && m.isInitiator ? "Awaiting response" : m.status}
              </Badge>
            </div>
            {m.status === "mutual" && m.conversationId && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/musician/p2p/messages?c=${m.conversationId}`}>
                  <MessageCircle className="mr-1.5 h-4 w-4" /> Message
                </Link>
              </Button>
            )}
            {m.status === "pending" && !m.isInitiator && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => respond(m.id, "decline")} disabled={busyId === m.id}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={() => respond(m.id, "accept")} disabled={busyId === m.id}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
