import { MapPin, DollarSign, Clock } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { formatMoney } from "@/lib/marketplace-fees";
import type { JobApplicationStatus } from "@/types";

const MOCK_APPLICATIONS = [
  { id: "a1", jobTitle: "DJ / Electronic Set – Friday Residency", venueName: "The Warehouse Club", location: "Camden, London", proposedFee: 400, currency: "GBP", status: "shortlisted" as JobApplicationStatus, appliedAt: "Apr 28, 2026", deadline: "May 10, 2026" },
  { id: "a2", jobTitle: "Full Band – Album Launch Party", venueName: "Electric Ballroom", location: "Camden, London", proposedFee: 1000, currency: "GBP", status: "submitted" as JobApplicationStatus, appliedAt: "Apr 30, 2026", deadline: "Jun 1, 2026" },
  { id: "a3", jobTitle: "Acoustic Set – Wine Bar Opening", venueName: "Vine & Barrel", location: "Islington, London", proposedFee: 200, currency: "GBP", status: "accepted" as JobApplicationStatus, appliedAt: "Apr 15, 2026", deadline: "Apr 20, 2026" },
  { id: "a4", jobTitle: "Wedding Band – Summer Ceremony", venueName: "Kew Gardens Pavilion", location: "Richmond, London", proposedFee: 750, currency: "GBP", status: "declined" as JobApplicationStatus, appliedAt: "Apr 10, 2026", deadline: "Apr 18, 2026" },
];

function statusVariant(s: JobApplicationStatus) {
  if (s === "accepted") return "success" as const;
  if (s === "shortlisted") return "warning" as const;
  if (s === "submitted") return "secondary" as const;
  return "destructive" as const;
}

export default function MusicianApplicationsPage() {
  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6"><h1 className="text-2xl font-bold text-stone-900">My Applications</h1><p className="text-stone-500 mt-1">Track the status of gig applications you&apos;ve submitted.</p></div>

          <div className="grid gap-3 sm:grid-cols-4 mb-6">
            {(["submitted", "shortlisted", "accepted", "declined"] as JobApplicationStatus[]).map((s) => (
              <Card key={s}><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{MOCK_APPLICATIONS.filter((a) => a.status === s).length}</p><p className="text-xs text-stone-500 capitalize">{s}</p></CardContent></Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>All Applications</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {MOCK_APPLICATIONS.map((app) => (
                <div key={app.id} className="rounded-xl border border-stone-100 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1"><h3 className="font-semibold text-stone-900">{app.jobTitle}</h3><Badge variant={statusVariant(app.status)}>{app.status}</Badge></div>
                      <p className="text-sm text-stone-600">{app.venueName}</p>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{app.location}</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />Proposed: {formatMoney(app.proposedFee, app.currency)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Applied {app.appliedAt}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {app.status === "submitted" && <Button size="sm" variant="outline">Withdraw</Button>}
                      {app.status === "accepted" && <Button size="sm">View Booking</Button>}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
