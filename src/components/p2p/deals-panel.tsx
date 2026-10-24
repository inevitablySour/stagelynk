"use client";

import { useEffect, useState } from "react";
import { DealCard, type DealRow } from "@/components/p2p/deal-card";
import { ProposeDealForm } from "@/components/p2p/propose-deal-form";

export function DealsPanel({
  matchId,
  otherMusicianId,
  currentMusicianId,
}: {
  matchId: string;
  otherMusicianId: string;
  currentMusicianId: string;
}) {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/p2p/deals?matchId=${matchId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setDeals(json.data);
      })
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) return <p className="text-sm text-stone-500">Loading deals…</p>;

  return (
    <div className="space-y-3">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} currentMusicianId={currentMusicianId} />
      ))}
      <ProposeDealForm
        matchId={matchId}
        otherMusicianId={otherMusicianId}
        onProposed={(deal) => setDeals((prev) => [deal, ...prev])}
      />
    </div>
  );
}
