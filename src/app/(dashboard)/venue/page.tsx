import { redirect } from "next/navigation";
import { Calendar, Star, Search, DollarSign, Briefcase, Megaphone, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { formatMoney } from "@/lib/marketplace-fees";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { BookingStatus } from "@/types";
import Link from "next/link";

const BOOKING_BADGE_VARIANT: Record<BookingStatus, "success" | "warning" | "secondary" | "destructive"> = {
  pending: "warning",
  accepted: "success",
  declined: "destructive",
  completed: "success",
  cancelled: "secondary",
};

export default async function VenueDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!venue) redirect("/onboarding/role");

  const [
    activeBookingsCount,
    openJobListingsCount,
    activePromotionsCount,
    reviewsGivenCount,
    paidBookings,
    recentBookings,
  ] = await Promise.all([
    prisma.booking.count({ where: { venueId: venue.id, status: { in: ["pending", "accepted"] } } }),
    prisma.jobListing.count({ where: { venueId: venue.id, status: "published" } }),
    prisma.promotionCampaign.count({ where: { venueId: venue.id, status: "active" } }),
    prisma.review.count({ where: { reviewerId: session.user.id } }),
    prisma.booking.findMany({
      where: { venueId: venue.id, paymentStatus: { in: ["paid", "partially_refunded"] } },
      select: { fee: true, platformFeeAmount: true, totalChargeAmount: true },
    }),
    prisma.booking.findMany({
      where: { venueId: venue.id },
      include: { musician: { select: { stageName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const spendBreakdown = paidBookings.reduce(
    (acc, b) => ({
      bookingFees: acc.bookingFees + b.fee,
      platformFees: acc.platformFees + b.platformFeeAmount,
      total: acc.total + b.totalChargeAmount,
    }),
    { bookingFees: 0, platformFees: 0, total: 0 }
  );

  const stats = [
    { label: "Active Bookings", value: String(activeBookingsCount), icon: Calendar, change: "pending + accepted" },
    { label: "Open Job Listings", value: String(openJobListingsCount), icon: Briefcase, change: "currently published" },
    { label: "Total Spend", value: formatMoney(spendBreakdown.total), icon: DollarSign, change: "incl. platform & processing fees" },
    { label: "Active Promotions", value: String(activePromotionsCount), icon: Megaphone, change: "running now" },
  ];

  return (
    <div className="flex min-h-screen section-muted">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <div className="flex-1 lg:pl-0">
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <section className="page-intro mb-8">
            <Building2 aria-hidden="true" className="pointer-events-none absolute -right-5 top-6 hidden h-48 w-48 rotate-12 text-brand/5 sm:block" />
            <div className="relative">
              <p className="eyebrow mb-3">Venue dashboard</p>
              <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{venue.venueName}</h1>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat) => (<Card key={stat.label} className="panel-soft"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-stone-500">{stat.label}</span><stat.icon className="h-4 w-4 text-olive-500" /></div><div className="mt-2 text-2xl font-bold text-stone-900">{stat.value}</div><p className="text-xs text-stone-400 mt-1">{stat.change}</p></CardContent></Card>))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="panel-soft lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Recent Bookings</CardTitle><Button variant="ghost" size="sm" asChild><Link href="/venue/bookings">View all</Link></Button></CardHeader>
              <CardContent>
                {recentBookings.length === 0 ? (
                  <p className="text-sm text-stone-500">No bookings yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentBookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-3">
                        <div><h4 className="font-medium text-stone-900">{b.musician.stageName}</h4><div className="flex items-center gap-2 mt-1 text-xs text-stone-500"><Calendar className="h-3 w-3" />{b.eventDate.toLocaleDateString()}</div></div>
                        <div className="flex items-center gap-2"><span className="font-semibold text-stone-900">{formatMoney(b.fee, b.currency)}</span><Badge variant={BOOKING_BADGE_VARIANT[b.status]}>{b.status}</Badge></div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="panel-soft">
                <CardHeader><CardTitle>Spend Summary</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-stone-500">Booking fees</dt><dd className="font-medium">{formatMoney(spendBreakdown.bookingFees)}</dd></div>
                    <div className="flex justify-between"><dt className="text-stone-500">Platform fees</dt><dd className="text-stone-400">{formatMoney(spendBreakdown.platformFees)}</dd></div>
                    <hr className="border-line" />
                    <div className="flex justify-between"><dt className="font-semibold text-stone-900">Total paid</dt><dd className="font-bold text-stone-900">{formatMoney(spendBreakdown.total)}</dd></div>
                  </dl>
                </CardContent>
              </Card>
              <Card className="panel-soft">
                <CardHeader><CardTitle>Reviews given</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    <span className="text-2xl font-bold text-stone-900">{reviewsGivenCount}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="panel-soft">
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
