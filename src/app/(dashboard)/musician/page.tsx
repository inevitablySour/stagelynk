import { redirect } from "next/navigation";
import { Calendar, Star, Music, Clock, DollarSign, Briefcase, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { formatMoney } from "@/lib/marketplace-fees";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { BookingStatus } from "@/types";
import Link from "next/link";
import { BookingCalendar } from "@/components/calendar/booking-calendar";

const BOOKING_BADGE_VARIANT: Record<BookingStatus, "success" | "warning" | "secondary" | "destructive"> = {
  pending: "warning",
  accepted: "success",
  declined: "destructive",
  completed: "success",
  cancelled: "secondary",
};

export default async function MusicianDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) redirect("/onboarding/role");

  const [
    completedGigsCount,
    pendingApplicationsCount,
    openJobListingsCount,
    paidBookings,
    upcomingGigs,
  ] = await Promise.all([
    prisma.booking.count({ where: { musicianId: musician.id, status: "completed" } }),
    prisma.jobApplication.count({ where: { musicianId: musician.id, status: "submitted" } }),
    prisma.jobListing.count({ where: { status: "published" } }),
    prisma.booking.findMany({
      where: { musicianId: musician.id, paymentStatus: { in: ["paid", "partially_refunded"] } },
      select: { fee: true, platformFeeAmount: true, processorFeeEstimate: true, netPayoutAmount: true },
    }),
    prisma.booking.findMany({
      where: { musicianId: musician.id, status: "accepted", eventDate: { gte: new Date() } },
      include: { venue: { select: { venueName: true } } },
      orderBy: { eventDate: "asc" },
      take: 5,
    }),
  ]);

  const revenueBreakdown = paidBookings.reduce(
    (acc, b) => ({
      gross: acc.gross + b.fee,
      platformFees: acc.platformFees + b.platformFeeAmount,
      processorFees: acc.processorFees + b.processorFeeEstimate,
      netPayout: acc.netPayout + b.netPayoutAmount,
    }),
    { gross: 0, platformFees: 0, processorFees: 0, netPayout: 0 }
  );

  const stats = [
    { label: "Completed Gigs", value: String(completedGigsCount), icon: Calendar },
    { label: "Avg Rating", value: musician.rating > 0 ? musician.rating.toFixed(1) : "—", icon: Star, change: `${musician.reviewCount} review${musician.reviewCount === 1 ? "" : "s"}` },
    { label: "Gross Revenue", value: formatMoney(revenueBreakdown.gross), icon: DollarSign },
    { label: "Pending Applications", value: String(pendingApplicationsCount), icon: FileText },
  ];

  return (
    <div className="flex min-h-screen section-muted">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <div className="flex-1 lg:pl-0">
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <section className="page-intro mb-8">
            <Music aria-hidden="true" className="pointer-events-none absolute -right-5 top-6 hidden h-48 w-48 rotate-12 text-brand/5 sm:block" />
            <div className="relative">
              <p className="eyebrow mb-3">Your dashboard</p>
              <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Welcome back, {musician.stageName}</h1>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label} className="panel-soft"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-stone-500">{stat.label}</span><stat.icon className="h-4 w-4 text-olive-500" /></div><div className="mt-2 text-2xl font-bold text-stone-900">{stat.value}</div>{stat.change && <p className="text-xs text-stone-400 mt-1">{stat.change}</p>}</CardContent></Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="panel-soft lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Upcoming Gigs</CardTitle><Button variant="ghost" size="sm" asChild><Link href="/musician/bookings">View all</Link></Button></CardHeader>
              <CardContent>
                {upcomingGigs.length === 0 ? (
                  <p className="text-sm text-stone-500">No upcoming gigs yet.</p>
                ) : (
                  <div className="space-y-4">
                    {upcomingGigs.map((gig) => (
                      <div key={gig.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-4">
                        <div><h4 className="font-medium text-stone-900">{gig.venue.venueName}</h4><div className="flex items-center gap-3 mt-1 text-sm text-stone-500"><span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{gig.eventDate.toLocaleDateString()}</span><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{gig.startTime} – {gig.endTime}</span></div></div>
                        <div className="text-right"><span className="font-semibold text-stone-900">{formatMoney(gig.fee, gig.currency)}</span><Badge variant={BOOKING_BADGE_VARIANT[gig.status]} className="ml-2">{gig.status}</Badge></div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="panel-soft">
                <CardHeader><CardTitle>Revenue Summary</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-stone-500">Gross earnings</dt><dd className="font-medium">{formatMoney(revenueBreakdown.gross)}</dd></div>
                    <div className="flex justify-between"><dt className="text-stone-500">Platform fees</dt><dd className="text-stone-400">−{formatMoney(revenueBreakdown.platformFees)}</dd></div>
                    <div className="flex justify-between"><dt className="text-stone-500">Processing fees</dt><dd className="text-stone-400">−{formatMoney(revenueBreakdown.processorFees)}</dd></div>
                    <hr className="border-line" />
                    <div className="flex justify-between"><dt className="font-semibold text-stone-900">Net payout</dt><dd className="font-bold text-brand">{formatMoney(revenueBreakdown.netPayout)}</dd></div>
                  </dl>
                </CardContent>
              </Card>
              <Card className="panel-soft">
                <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/musician/jobs"><Briefcase className="mr-2 h-4 w-4" /> Browse open gigs ({openJobListingsCount})</Link></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/musician/applications"><FileText className="mr-2 h-4 w-4" /> My applications</Link></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/musician/profile"><Music className="mr-2 h-4 w-4" /> Edit profile</Link></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/settings"><Star className="mr-2 h-4 w-4" /> Account settings</Link></Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card id="calendar" className="panel-soft mt-6 scroll-mt-6">
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
              <p className="text-sm text-stone-500">Your bookings, project due dates and availability in one view.</p>
            </CardHeader>
            <CardContent><BookingCalendar role="musician" /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
