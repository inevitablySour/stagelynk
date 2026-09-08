import { MapPin, Calendar, DollarSign, Users, Sparkles, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { formatMoney } from "@/lib/marketplace-fees";
import Link from "next/link";

export const metadata = { title: "Open Projects" };

const MOCK_JOBS = [
  { id: "j1", title: "DJ / Electronic Set – Friday Residency", venueName: "The Warehouse Club", location: "Camden, London", eventDate: "Every Friday", budgetMin: 300, budgetMax: 500, currency: "GBP", genres: ["Electronic", "House", "Techno"], applicantCount: 12, isPromoted: true },
  { id: "j2", title: "Voiceover – Animated Short Film", venueName: "Pixel Motion Studios", location: "Remote", eventDate: "Jun 2026", budgetMin: 200, budgetMax: 400, currency: "GBP", genres: ["Voice Acting", "Animation"], applicantCount: 8, isPromoted: false },
  { id: "j3", title: "Full Band – Album Launch Party", venueName: "Electric Ballroom", location: "Camden, London", eventDate: "Jun 20, 2026", budgetMin: 800, budgetMax: 1200, currency: "GBP", genres: ["Rock", "Indie", "Pop"], applicantCount: 28, isPromoted: true },
  { id: "j4", title: "Actor – Corporate Training Video", venueName: "Acme Corp", location: "Manchester, UK", eventDate: "Jul 2026", budgetMin: 500, budgetMax: 800, currency: "GBP", genres: ["Acting", "Corporate"], applicantCount: 6, isPromoted: false },
  { id: "j5", title: "Jazz Trio – Private Corporate Event", venueName: "The Shard Penthouse", location: "London Bridge", eventDate: "Jun 8, 2026", budgetMin: 600, budgetMax: 900, currency: "GBP", genres: ["Jazz", "Blues", "Soul"], applicantCount: 8, isPromoted: false },
  { id: "j6", title: "Photographer – Product Launch Event", venueName: "Nova Agency", location: "Shoreditch, London", eventDate: "May 30, 2026", budgetMin: 250, budgetMax: 400, currency: "GBP", genres: ["Photography", "Events"], applicantCount: 14, isPromoted: true },
];

export default function PublicJobsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-stone-900">Open Projects</h1>
            <p className="mt-2 text-stone-500">Browse opportunities from clients looking for creative talent. Sign in to apply.</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input className="pl-10" placeholder="Search by title, category, or location..." />
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
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.applicantCount} applicants</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.genres.map((g) => <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>)}
                      </div>
                    </div>
                    <Button size="sm" asChild><Link href="/register">Sign up to apply</Link></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
