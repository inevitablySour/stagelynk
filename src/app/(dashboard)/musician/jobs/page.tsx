import { Briefcase, MapPin, Calendar, DollarSign, Clock, Users, Sparkles } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { formatMoney } from "@/lib/marketplace-fees";

const MOCK_JOBS = [
  { id: "j1", title: "DJ / Electronic Set – Friday Residency", venueName: "The Warehouse Club", location: "Camden, London", eventType: "Club Night", eventDate: "Every Friday", budgetMin: 300, budgetMax: 500, currency: "GBP", genres: ["Electronic", "House", "Techno"], requiredServices: ["Own DJ setup", "USB/CDJ ready"], applicationDeadline: "May 10, 2026", applicantCount: 12, isPromoted: true },
  { id: "j2", title: "Acoustic Solo Act – Sunday Brunch", venueName: "The Olive Garden Café", location: "Shoreditch, London", eventType: "Brunch Session", eventDate: "May 25, 2026", budgetMin: 150, budgetMax: 200, currency: "GBP", genres: ["Acoustic", "Folk", "Indie"], requiredServices: ["Own guitar/instrument"], applicationDeadline: "May 18, 2026", applicantCount: 5, isPromoted: false },
  { id: "j3", title: "Full Band – Album Launch Party", venueName: "Electric Ballroom", location: "Camden, London", eventType: "Concert", eventDate: "Jun 20, 2026", budgetMin: 800, budgetMax: 1200, currency: "GBP", genres: ["Rock", "Indie", "Pop"], requiredServices: ["Stage plot required", "Sound engineer provided"], applicationDeadline: "Jun 1, 2026", applicantCount: 28, isPromoted: true },
  { id: "j4", title: "Jazz Trio – Private Corporate Event", venueName: "The Shard Penthouse", location: "London Bridge, London", eventType: "Corporate Event", eventDate: "Jun 8, 2026", budgetMin: 600, budgetMax: 900, currency: "GBP", genres: ["Jazz", "Blues", "Soul"], requiredServices: ["Smart dress code", "Background/ambient set"], applicationDeadline: "May 28, 2026", applicantCount: 8, isPromoted: false },
];

export default function MusicianJobsPage() {
  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6"><h1 className="text-2xl font-bold text-stone-900">Open Gigs</h1><p className="text-stone-500 mt-1">Browse opportunities posted by venues and apply directly.</p></div>

          <div className="relative mb-6">
            <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input className="pl-10" placeholder="Search by title, genre, or location..." />
          </div>

          <div className="space-y-4">
            {MOCK_JOBS.map((job) => (
              <Card key={job.id} className={job.isPromoted ? "ring-1 ring-accent/40" : ""}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-stone-900">{job.title}</h3>
                        {job.isPromoted && <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px]"><Sparkles className="mr-0.5 h-3 w-3" />Promoted</Badge>}
                      </div>
                      <p className="text-sm text-stone-600">{job.venueName}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{job.eventDate}</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatMoney(job.budgetMin, job.currency)} – {formatMoney(job.budgetMax, job.currency)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Apply by {job.applicationDeadline}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.applicantCount} applicants</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.genres.map((g) => <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>)}
                      </div>
                      {job.requiredServices.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {job.requiredServices.map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                        </div>
                      )}
                    </div>
                    <Button size="sm" className="shrink-0">Apply Now</Button>
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
