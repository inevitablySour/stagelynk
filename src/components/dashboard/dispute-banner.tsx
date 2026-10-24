"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Dispute {
  id: string;
  kind: "cancellation" | "refund_request";
  timing: "pre_event" | "post_event";
  status: string;
  initiatedBy: "musician" | "venue";
  reason: string;
  requestedRefundAmount: number | null;
  responseDeadline: string | null;
  createdAt: string;
}

const RESOLVED = new Set(["resolved_refund_full", "resolved_refund_partial", "resolved_no_refund"]);

export function DisputeBanner({
  bookingId,
  viewerRole,
  canFile,
}: {
  bookingId: string;
  viewerRole: "musician" | "venue";
  /** Whether this booking is eligible for a new dispute from the viewer's side (paid + accepted/completed, no open dispute shown separately). */
  canFile: boolean;
}) {
  const [disputes, setDisputes] = useState<Dispute[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<"cancellation" | "refund_request">("refund_request");
  const [timing, setTiming] = useState<"pre_event" | "post_event">("post_event");
  const [reason, setReason] = useState("");
  const [requestedRefundAmount, setRequestedRefundAmount] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/bookings/${bookingId}/disputes`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) setDisputes(json.data);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const file = async () => {
    if (reason.trim().length < 10) {
      setError("Describe the issue in at least 10 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/disputes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          timing,
          reason: reason.trim(),
          requestedRefundAmount: requestedRefundAmount ? Number(requestedRefundAmount) : undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to file dispute.");
        return;
      }
      setDisputes((prev) => [json.data, ...(prev ?? [])]);
      setShowForm(false);
      setReason("");
      setRequestedRefundAmount("");
    } finally {
      setBusy(false);
    }
  };

  const respond = async (disputeId: string, action: "respond-accept" | "respond-decline") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to respond.");
        return;
      }
      setDisputes((prev) => (prev ?? []).map((d) => (d.id === disputeId ? json.data : d)));
    } finally {
      setBusy(false);
    }
  };

  if (disputes === null) return null;

  const openDispute = disputes.find((d) => !RESOLVED.has(d.status));

  return (
    <div className="mt-3 space-y-2">
      {openDispute && (
        <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">
                {openDispute.initiatedBy === viewerRole ? "You filed a dispute" : "A dispute was filed against this booking"} · {openDispute.status.replace(/_/g, " ")}
              </p>
              <p className="mt-0.5 text-red-700">{openDispute.reason}</p>
              {openDispute.responseDeadline && openDispute.status === "pending_response" && (
                <p className="mt-0.5 text-xs text-red-600">Respond before {new Date(openDispute.responseDeadline).toLocaleString()}</p>
              )}
            </div>
          </div>
          {openDispute.status === "pending_response" && openDispute.initiatedBy !== viewerRole && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => respond(openDispute.id, "respond-accept")} disabled={busy}>
                Accept claim
              </Button>
              <Button size="sm" variant="outline" onClick={() => respond(openDispute.id, "respond-decline")} disabled={busy}>
                Dispute the claim
              </Button>
            </div>
          )}
        </div>
      )}

      {!openDispute && canFile && !showForm && (
        <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" onClick={() => setShowForm(true)}>
          <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> File a dispute
        </Button>
      )}

      {showForm && (
        <div className="space-y-2 rounded-lg border border-stone-200 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select className="rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="refund_request">Refund request</option>
              <option value="cancellation">Cancellation</option>
            </select>
            <select className="rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm" value={timing} onChange={(e) => setTiming(e.target.value as typeof timing)}>
              <option value="pre_event">Before the event</option>
              <option value="post_event">After the event</option>
            </select>
          </div>
          <textarea
            className="min-h-20 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
            placeholder="What happened? (10+ characters)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Requested refund amount (optional)"
            value={requestedRefundAmount}
            onChange={(e) => setRequestedRefundAmount(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={file} disabled={busy}>
              {busy ? "Filing..." : "File dispute"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && !showForm && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
