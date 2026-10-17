"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, Search, Users, Handshake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, calculateMarketplaceFees } from "@/lib/marketplace-fees";
import type { BookingStatus, PayoutStatus } from "@/types";

export interface VenueBookingRow {
  id: string;
  artist: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  fee: number;
  currency: string;
  status: BookingStatus;
  payoutStatus: PayoutStatus;
  source: string;
  paymentStatus?: string;
  audienceSize: number | null;
  negotiationStatus?: string;
  proposedFee?: number | null;
}

function statusVariant(s: BookingStatus) {
  if (s === "accepted" || s === "completed") return "success" as const;
  if (s === "pending") return "warning" as const;
  return "destructive" as const;
}

export function VenueBookingsManager({ bookings }: { bookings: VenueBookingRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rows, setRows] = useState(bookings);

  const filtered = rows.filter((b) => !query || b.artist.toLowerCase().includes(query.toLowerCase()));
  const totalSpend = rows.filter((booking) => booking.paymentStatus === "paid" || booking.paymentStatus === "partially_refunded").reduce((s, b) => s + calculateMarketplaceFees(b.fee, { currency: b.currency }).totalChargeAmount, 0);

  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const act = async (id: string, action: "cancel" | "accept-counter" | "decline-counter") => {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        setRows((prev) =>
          prev.map((b) =>
            b.id === id
              ? { ...b, status: json.data.status, negotiationStatus: json.data.negotiationStatus, proposedFee: json.data.proposedFee, fee: json.data.fee }
              : b
          )
        );
        router.refresh();
      } else {
        setActionError(json.message ?? "That action couldn't be completed.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const releasePayout = async (id: string) => {
    setBusyId(id);
    setPayoutError(null);
    try {
      const res = await fetch(`/api/bookings/${id}/release-payout`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setRows((prev) => prev.map((b) => (b.id === id ? { ...b, payoutStatus: "paid" } : b)));
        router.refresh();
      } else {
        setPayoutError(json.message ?? "Unable to release payout.");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Venue Bookings</h1>
          <p className="mt-1 text-stone-500">Track requests, confirmed performances, and completed gigs.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-stone-500">Total spend:</span>
          <span className="font-bold text-stone-900">{formatMoney(totalSpend)}</span>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input className="pl-10" placeholder="Search bookings by artist..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle>All Bookings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {payoutError && <p className="text-sm text-red-600">{payoutError}</p>}
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          {filtered.length === 0 && <p className="text-sm text-stone-500 text-center py-6">No bookings yet.</p>}
          {filtered.map((b) => {
            const fees = calculateMarketplaceFees(b.fee, { currency: b.currency });
            const hasCounter = b.source === "direct_request" && b.negotiationStatus === "counter_pending";
            return (
              <div key={b.id} className="rounded-xl border border-stone-100 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-stone-900">{b.artist}</h3>
                      <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                      {b.source === "job_application" && <Badge variant="secondary">Via job</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-stone-500 mt-1">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(b.eventDate).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.startTime} – {b.endTime}</span>
                      <span>{b.eventType}</span>
                      {b.audienceSize != null && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{b.audienceSize}</span>}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-semibold text-stone-900">{formatMoney(fees.totalChargeAmount, b.currency)}</div>
                    <p className="text-[10px] text-stone-400">Artist: {formatMoney(b.fee, b.currency)} · Fee: {formatMoney(fees.platformFeeAmount, b.currency)}</p>
                    <div className="flex gap-2 justify-end mt-1">
                      {(b.status === "pending" || b.status === "accepted") && !hasCounter && b.source !== "job_application" && (
                        <Button size="sm" variant="outline" onClick={() => act(b.id, "cancel")} disabled={busyId === b.id}>Cancel</Button>
                      )}
                      {b.source === "job_application" && b.status === "pending" && <Button size="sm" variant="outline" asChild><Link href="/venue/jobs">Manage application payment</Link></Button>}
                      {b.status === "completed" && b.payoutStatus === "pending" && (
                        <Button size="sm" onClick={() => releasePayout(b.id)} disabled={busyId === b.id}>
                          {busyId === b.id ? "Releasing..." : "Release payout now"}
                        </Button>
                      )}
                      {b.status === "completed" && b.payoutStatus === "paid" && (
                        <Badge variant="success">Payout sent</Badge>
                      )}
                    </div>
                    {b.status === "completed" && b.payoutStatus === "pending" && (
                      <p className="text-[10px] text-stone-400 mt-1">
                        Gig marked complete. You can release the artist&apos;s payout now, or wait until after
                        the event date.
                      </p>
                    )}
                  </div>
                </div>
                {hasCounter && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <Handshake className="h-4 w-4 shrink-0" />
                    <span>
                      {b.artist} countered with {formatMoney(b.proposedFee ?? b.fee, b.currency)}.
                    </span>
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" onClick={() => act(b.id, "accept-counter")} disabled={busyId === b.id}>
                        Accept counter
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => act(b.id, "decline-counter")} disabled={busyId === b.id}>
                        Decline counter
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
