"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, X, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Suggestion {
  musicianId: string;
  stageName: string;
  profileImage: string | null;
  location: string;
  genres: string[];
}

export function MatchSuggestions() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/p2p/matches/suggestions")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSuggestions(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const respond = async (musicianId: string, liked: boolean) => {
    setBusyId(musicianId);
    setMessage(null);
    try {
      if (liked) {
        const res = await fetch("/api/p2p/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetMusicianId: musicianId }),
        });
        const json = await res.json();
        if (json.success && json.data.status === "mutual") {
          setMessage("It's a match! Check your matches to start chatting.");
          router.refresh();
        }
      }
      setSuggestions((prev) => prev.filter((s) => s.musicianId !== musicianId));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="text-sm text-stone-500">Finding suggestions…</p>;

  if (suggestions.length === 0) {
    return (
      <div className="empty-state">
        <p className="text-sm text-stone-500">No new suggestions right now. Check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && <p className="text-sm font-medium text-brand">{message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {suggestions.map((s) => (
          <Card key={s.musicianId}>
            <CardContent className="p-5">
              <h3 className="font-semibold text-stone-900">{s.stageName}</h3>
              {s.location && (
                <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {s.location}
                </p>
              )}
              {s.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.genres.slice(0, 4).map((g) => (
                    <Badge key={g} variant="secondary">
                      {g}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => respond(s.musicianId, false)}
                  disabled={busyId === s.musicianId}
                >
                  <X className="mr-1.5 h-4 w-4" /> Pass
                </Button>
                <Button size="sm" onClick={() => respond(s.musicianId, true)} disabled={busyId === s.musicianId}>
                  <Heart className="mr-1.5 h-4 w-4" /> Like
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
