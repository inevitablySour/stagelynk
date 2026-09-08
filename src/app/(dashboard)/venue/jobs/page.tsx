import { Plus, Calendar, Users, DollarSign, MapPin, Eye, Sparkles } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { formatMoney } from "@/lib/marketplace-fees";
import type { JobListingStatus } from "@/types";

const MOCK_LISTINGS = [
  { id: "j1", title: "DJ / Electronic Set – Friday Residency", eventDate: "Every Friday", location: "Camden, London", budgetMin: 300, budgetMax: 500, currency: "GBP", status: "published" as JobListingStatus, applicantCount: 12, isPromoted: true, views: 342, createdAt: "Apr 20, 2026" },
  { id: "j2", title: "Acoustic Solo Act – Sunday Brunch", eventDate: "May 25, 2026", location: "Shoreditch, London", budgetMin: 150, budgetMax: 200, currency: "GBP", status: "published" as JobListingStatus, applicantCount: 5, isPromoted: false, views: 89, createdAt: "Apr 25, 2026" },
  { id: "j3", title: "Full Band – Album Launch Party", eventDate: "Jun 20, 2026", location: "Camden, London", budgetMin: 800, budgetMax: 1200, currency: "GBP", status: "draft" as JobListingStatus, applicantCount: 0, isPromoted: false, views: 0, createdAt: "Apr 30, 2026" },
  { id: "j4", title: "Jazz Quartet – NYE Gala 2025", eventDate: "Dec 31, 2025", location: "Camden, London", budgetMin: 1000, budgetMax: 1500, currency: "GBP", status: "filled" as JobListingStatus, applicantCount: 18, isPromoted: false, views: 520, createdAt: "Nov 10, 2025" },
];

function statusVariant(s: JobListingStatus) {
  if (s === "published") return "success" as const;
  if (s === "draft") return "secondary" as const;
  if (s === "filled") return "default" as const;
  return "warning" as const;
}

export default function VenueJobsPage() {
  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-stone-900">Job Listings</h1><p className="text-stone-500 mt-1">Post gig opportunities and review musician applications.</p></div>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Listing</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 mb-6">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{MOCK_LISTINGS.filter((l) => l.status === "published").length}</p><p className="text-xs text-stone-500">Published</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{MOCK_LISTINGS.reduce((s, l) => s + l.applicantCount, 0)}</p><p className="text-xs text-stone-500">Total applicants</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{MOCK_LISTINGS.reduce((s, l) => s + l.views, 0)}</p><p className="text-xs text-stone-500">Total views</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{MOCK_LISTINGS.filter((l) => l.isPromoted).length}</p><p className="text-xs text-stone-500">Promoted</p></CardContent></Card>
          </div>

          <div className="space-y-4">
            {MOCK_LISTINGS.map((listing) => (
              <Card key={listing.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-stone-900">{listing.title}</h3>
                        <Badge variant={statusVariant(listing.status)}>{listing.status}</Badge>
                        {listing.isPromoted && <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px]"><Sparkles className="mr-0.5 h-3 w-3" />Promoted</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-stone-500 mt-1">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{listing.eventDate}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.location}</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatMoney(listing.budgetMin, listing.currency)} – {formatMoney(listing.budgetMax, listing.currency)}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{listing.applicantCount} applicants</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.views} views</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {listing.applicantCount > 0 && <Button size="sm" variant="outline">View Applicants</Button>}
                      {listing.status === "draft" && <Button size="sm">Publish</Button>}
                      {listing.status === "published" && !listing.isPromoted && <Button size="sm" variant="outline"><Sparkles className="mr-1 h-3 w-3" />Promote</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
