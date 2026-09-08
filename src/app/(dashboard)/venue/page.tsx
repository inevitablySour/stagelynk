import { Calendar, Star, Search, Users, DollarSign, Briefcase, Eye, TrendingUp, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { formatMoney } from "@/lib/marketplace-fees";
import Link from "next/link";

const stats = [
  { label: "Active Bookings", value: "5", icon: Calendar, change: "2 pending" },
  { label: "Open Job Listings", value: "3", icon: Briefcase, change: "18 total applicants" },
  { label: "Total Spend", value: formatMoney(4250), icon: DollarSign, change: "Incl. 5% platform fee" },
  { label: "Profile Views", value: "842", icon: Eye, change: "+15% this week" },
];

const insights = [
  { label: "Booking conversion", value: "68%", icon: TrendingUp },
  { label: "Avg. applicants/job", value: "12", icon: Users },
  { label: "Active promotions", value: "2", icon: Megaphone },
  { label: "Reviews given", value: "14", icon: Star },
];

const recentBookings = [
  { id: "1", artist: "Nova Eclipse", date: "May 15, 2026", fee: 450, status: "accepted", genre: "Electronic" },
  { id: "2", artist: "The Velvet Tongues", date: "May 22, 2026", fee: 800, status: "pending", genre: "Funk / Soul" },
  { id: "3", artist: "Maya Chen", date: "Jun 1, 2026", fee: 550, status: "accepted", genre: "Jazz" },
];

const spendBreakdown = { bookingFees: 4250, platformFees: 212.5, promotionSpend: 85, total: 4547.5 };

export default function VenueDashboard() {
  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <div className="flex-1 lg:pl-0">
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="mb-8"><h1 className="text-2xl font-bold text-stone-900">Venue Dashboard</h1><p className="text-stone-500 mt-1">The Warehouse Club</p></div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {stats.map((stat) => (<Card key={stat.label}><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-stone-500">{stat.label}</span><stat.icon className="h-4 w-4 text-olive-500" /></div><div className="mt-2 text-2xl font-bold text-stone-900">{stat.value}</div><p className="text-xs text-stone-400 mt-1">{stat.change}</p></CardContent></Card>))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {insights.map((item) => (<Card key={item.label}><CardContent className="p-4 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft"><item.icon className="h-4 w-4 text-brand" /></div><div><p className="text-xs text-stone-500">{item.label}</p><p className="text-lg font-bold text-stone-900">{item.value}</p></div></CardContent></Card>))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Recent Bookings</CardTitle><Button variant="ghost" size="sm" asChild><Link href="/venue/bookings">View all</Link></Button></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentBookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-3">
                      <div><h4 className="font-medium text-stone-900">{b.artist}</h4><div className="flex items-center gap-2 mt-1 text-xs text-stone-500"><Calendar className="h-3 w-3" />{b.date}<span>·</span><span>{b.genre}</span></div></div>
                      <div className="flex items-center gap-2"><span className="font-semibold text-stone-900">{formatMoney(b.fee)}</span><Badge variant={b.status === "accepted" ? "success" : "warning"}>{b.status}</Badge></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Spend Summary</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-stone-500">Booking fees</dt><dd className="font-medium">{formatMoney(spendBreakdown.bookingFees)}</dd></div>
                    <div className="flex justify-between"><dt className="text-stone-500">Platform fees (5%)</dt><dd className="text-stone-400">{formatMoney(spendBreakdown.platformFees)}</dd></div>
                    <div className="flex justify-between"><dt className="text-stone-500">Promotion spend</dt><dd className="text-stone-400">{formatMoney(spendBreakdown.promotionSpend)}</dd></div>
                    <hr className="border-line" />
                    <div className="flex justify-between"><dt className="font-semibold text-stone-900">Total</dt><dd className="font-bold text-stone-900">{formatMoney(spendBreakdown.total)}</dd></div>
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" asChild><Link href="/venue/jobs"><Briefcase className="mr-2 h-4 w-4" /> Post a job listing</Link></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/artists"><Search className="mr-2 h-4 w-4" /> Find artists</Link></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/venue/promotions"><Megaphone className="mr-2 h-4 w-4" /> Manage promotions</Link></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/venue/bookings"><Calendar className="mr-2 h-4 w-4" /> Manage bookings</Link></Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
