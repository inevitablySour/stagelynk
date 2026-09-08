import { Calendar, Star, Music, TrendingUp, Clock, DollarSign, Eye, Briefcase, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { formatMoney } from "@/lib/marketplace-fees";
import Link from "next/link";

const stats = [
  { label: "Total Gigs", value: "42", icon: Calendar, change: "+3 this month", up: true },
  { label: "Avg Rating", value: "4.8", icon: Star, change: "Top 10%", up: true },
  { label: "Gross Revenue", value: formatMoney(8240), icon: DollarSign, change: "+12% vs last month", up: true },
  { label: "Profile Views", value: "1,247", icon: Eye, change: "+28% this week", up: true },
];

const insights = [
  { label: "Search appearances", value: "3,842", icon: TrendingUp },
  { label: "Response rate", value: "94%", icon: Clock },
  { label: "Pending applications", value: "2", icon: FileText },
  { label: "Open gig matches", value: "7", icon: Briefcase },
];

const upcomingGigs = [
  { id: "1", venue: "The Warehouse Club", date: "May 15, 2026", time: "9:00 PM – 1:00 AM", fee: 450, status: "accepted" },
  { id: "2", venue: "Rooftop Bar London", date: "May 22, 2026", time: "7:00 PM – 10:00 PM", fee: 300, status: "pending" },
  { id: "3", venue: "Electric Ballroom", date: "Jun 5, 2026", time: "10:00 PM – 2:00 AM", fee: 600, status: "accepted" },
];

const revenueBreakdown = { gross: 8240, platformFees: 412, processorFees: 240, netPayout: 7588 };

export default function MusicianDashboard() {
  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <div className="flex-1 lg:pl-0">
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="mb-8"><h1 className="text-2xl font-bold text-stone-900">Dashboard</h1><p className="text-stone-500 mt-1">Welcome back, Nova Eclipse</p></div>

          {/* Main stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {stats.map((stat) => (
              <Card key={stat.label}><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-stone-500">{stat.label}</span><stat.icon className="h-4 w-4 text-olive-500" /></div><div className="mt-2 text-2xl font-bold text-stone-900">{stat.value}</div><p className="text-xs text-emerald-600 mt-1">{stat.change}</p></CardContent></Card>
            ))}
          </div>

          {/* Insights row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {insights.map((item) => (
              <Card key={item.label}><CardContent className="p-4 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft"><item.icon className="h-4 w-4 text-brand" /></div><div><p className="text-xs text-stone-500">{item.label}</p><p className="text-lg font-bold text-stone-900">{item.value}</p></div></CardContent></Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Upcoming gigs */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Upcoming Gigs</CardTitle><Button variant="ghost" size="sm" asChild><Link href="/musician/bookings">View all</Link></Button></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingGigs.map((gig) => (
                    <div key={gig.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-4">
                      <div><h4 className="font-medium text-stone-900">{gig.venue}</h4><div className="flex items-center gap-3 mt-1 text-sm text-stone-500"><span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{gig.date}</span><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{gig.time}</span></div></div>
                      <div className="text-right"><span className="font-semibold text-stone-900">{formatMoney(gig.fee)}</span><Badge variant={gig.status === "accepted" ? "success" : "warning"} className="ml-2">{gig.status}</Badge></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue & quick actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Revenue Summary</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-stone-500">Gross earnings</dt><dd className="font-medium">{formatMoney(revenueBreakdown.gross)}</dd></div>
                    <div className="flex justify-between"><dt className="text-stone-500">StageLynk fees (5%)</dt><dd className="text-stone-400">−{formatMoney(revenueBreakdown.platformFees)}</dd></div>
                    <div className="flex justify-between"><dt className="text-stone-500">Processing fees</dt><dd className="text-stone-400">−{formatMoney(revenueBreakdown.processorFees)}</dd></div>
                    <hr className="border-line" />
                    <div className="flex justify-between"><dt className="font-semibold text-stone-900">Net payout</dt><dd className="font-bold text-brand">{formatMoney(revenueBreakdown.netPayout)}</dd></div>
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/musician/jobs"><Briefcase className="mr-2 h-4 w-4" /> Browse open gigs</Link></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/musician/applications"><FileText className="mr-2 h-4 w-4" /> My applications</Link></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/musician/profile"><Music className="mr-2 h-4 w-4" /> Edit profile</Link></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/settings"><Star className="mr-2 h-4 w-4" /> Account settings</Link></Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
