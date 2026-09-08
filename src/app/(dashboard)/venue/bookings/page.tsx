import { Calendar, Clock, Search, Users } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { formatMoney, calculateMarketplaceFees } from "@/lib/marketplace-fees";

const bookings = [
  { id: "1", artist: "Nova Eclipse", genre: "Electronic", date: "May 15, 2026", time: "9:00 PM – 1:00 AM", fee: 450, status: "accepted", source: "direct_request", audienceSize: 350 },
  { id: "2", artist: "The Velvet Tongues", genre: "Funk / Soul", date: "May 22, 2026", time: "8:00 PM – 11:00 PM", fee: 800, status: "pending", source: "job_application", audienceSize: 200 },
  { id: "3", artist: "Maya Chen", genre: "Jazz", date: "Jun 1, 2026", time: "7:30 PM – 10:30 PM", fee: 550, status: "accepted", source: "direct_request", audienceSize: 150 },
];

export default function VenueBookingsPage() {
  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-stone-900">Venue Bookings</h1><p className="mt-1 text-stone-500">Track requests, confirmed performances, and completed gigs.</p></div>
            <div className="flex items-center gap-2 text-sm"><span className="text-stone-500">Total spend:</span><span className="font-bold text-stone-900">{formatMoney(bookings.reduce((s, b) => s + calculateMarketplaceFees(b.fee).totalChargeAmount, 0))}</span></div>
          </div>

          <div className="relative mb-6"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><Input className="pl-10" placeholder="Search bookings by artist..." /></div>

          <Card>
            <CardHeader><CardTitle>All Bookings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {bookings.map((b) => {
                const fees = calculateMarketplaceFees(b.fee);
                return (
                  <div key={b.id} className="rounded-xl border border-stone-100 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-stone-900">{b.artist}</h3>
                          <Badge variant={b.status === "accepted" ? "success" : "warning"}>{b.status}</Badge>
                          {b.source === "job_application" && <Badge variant="secondary">Via job</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-stone-500 mt-1">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{b.date}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.time}</span>
                          <span>{b.genre}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{b.audienceSize}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-semibold text-stone-900">{formatMoney(fees.totalChargeAmount)}</div>
                        <p className="text-[10px] text-stone-400">Artist: {formatMoney(b.fee)} · Fee: {formatMoney(fees.platformFeeAmount)}</p>
                        <div className="flex gap-2 justify-end mt-1">
                          {b.status === "pending" && <><Button size="sm">Confirm</Button><Button size="sm" variant="outline">Cancel</Button></>}
                          <Button size="sm" variant="outline">Details</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
