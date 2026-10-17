"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, DollarSign, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/marketplace-fees";
import type { JobApplicationStatus } from "@/types";

export interface ApplicationRow {
  id: string;
  jobTitle: string;
  venueName: string;
  location: string;
  proposedFee: number | null;
  currency: string;
  status: JobApplicationStatus;
  appliedAt: string;
  bookingId: string | null;
}

function statusVariant(s: JobApplicationStatus) {
  if (s === "accepted") return "success" as const;
  if (s === "shortlisted") return "warning" as const;
  if (s === "submitted") return "secondary" as const;
  return "destructive" as const;
}

export function MusicianApplicationsManager({ applications }: { applications: ApplicationRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rows, setRows] = useState(applications);
  const [error, setError] = useState("");

  const withdraw = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/musicians/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      const json = await res.json();
      if (json.success) {
        setRows((prev) => prev.map((a) => (a.id === id ? { ...a, status: "withdrawn" } : a)));
        router.refresh();
      } else setError(json.message ?? "Unable to withdraw this application.");
    } catch {
      setError("Unable to withdraw this application. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        {(["submitted", "shortlisted", "accepted", "declined"] as JobApplicationStatus[]).map((s) => (
          <Card key={s}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-stone-900">{rows.filter((a) => a.status === s).length}</p>
              <p className="text-xs text-stone-500 capitalize">{s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>All Applications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 && <p className="text-sm text-stone-500 text-center py-6">You haven&apos;t applied to any listings yet.</p>}
          {rows.map((app) => (
            <div key={app.id} className="rounded-xl border border-stone-100 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-stone-900">{app.jobTitle}</h3>
                    <Badge variant={statusVariant(app.status)}>{app.status === "submitted" ? "Application pending" : app.status === "accepted" ? "Booking confirmed" : app.status}</Badge>
                  </div>
                  <p className="text-sm text-stone-600">{app.venueName}</p>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-stone-500">
                    {app.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{app.location}</span>}
                    {app.proposedFee != null && (
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />Proposed: {formatMoney(app.proposedFee, app.currency)}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(app.status === "submitted" || app.status === "shortlisted") && (
                    <Button size="sm" variant="outline" onClick={() => withdraw(app.id)} disabled={busyId === app.id}>
                      {busyId === app.id ? "Withdrawing..." : "Withdraw"}
                    </Button>
                  )}
                  {app.status === "accepted" && app.bookingId && (
                    <Button size="sm" asChild><Link href="/musician/bookings">View Booking</Link></Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
