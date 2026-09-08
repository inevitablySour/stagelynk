"use client";

import { useState } from "react";
import { Calendar, Clock, MapPin, Users, Phone, Mail, User, ChevronDown, ChevronUp, CheckCircle2, XCircle, Mic2 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { formatMoney, calculateMarketplaceFees } from "@/lib/marketplace-fees";
import type { BookingStatus } from "@/types";

const MOCK_BOOKINGS = [
  { id: "1", title: "Friday Night Live", eventType: "Club Night", venue: "The Warehouse Club", venueAddress: "42 Camden High St, London NW1", date: "May 15, 2026", time: "9:00 PM – 1:00 AM", fee: 450, currency: "GBP", depositAmount: 100, audienceSize: 350, loadInTime: "6:00 PM", soundcheckTime: "7:30 PM", status: "accepted" as BookingStatus, source: "direct_request", requiredServices: [{ label: "PA System", included: true }, { label: "Sound Engineer", included: true }, { label: "Lighting", included: true }, { label: "Backline", included: false, notes: "Bring own gear" }], equipmentProvided: ["Main PA", "Monitors", "Stage lighting"], contactName: "Sarah Mitchell", contactEmail: "sarah@warehouse.club", contactPhone: "+44 7700 900123", notes: "Main room headline set. 90-minute slot.", cancellationPolicy: "48-hour cancellation with full refund." },
  { id: "2", title: "Rooftop Sunset Session", eventType: "Private Event", venue: "Rooftop Bar London", venueAddress: "10 Shoreditch High St, London E1", date: "May 22, 2026", time: "7:00 PM – 10:00 PM", fee: 300, currency: "GBP", depositAmount: 0, audienceSize: 120, loadInTime: "5:00 PM", soundcheckTime: "6:00 PM", status: "pending" as BookingStatus, source: "job_application", requiredServices: [{ label: "PA System", included: true }, { label: "Sound Engineer", included: false, notes: "Artist manages own sound" }], equipmentProvided: ["Portable PA"], contactName: "James Cooper", contactEmail: "james@rooftopbar.co", contactPhone: "+44 7700 900456", notes: "Acoustic chill set. Sunset vibe.", cancellationPolicy: "24-hour cancellation." },
  { id: "3", title: "Electric Ballroom Headline", eventType: "Concert", venue: "Electric Ballroom", venueAddress: "184 Camden High St, London NW1", date: "Jun 5, 2026", time: "10:00 PM – 2:00 AM", fee: 600, currency: "GBP", depositAmount: 200, audienceSize: 800, loadInTime: "4:00 PM", soundcheckTime: "5:30 PM", status: "accepted" as BookingStatus, source: "direct_request", requiredServices: [{ label: "PA System", included: true }, { label: "Sound Engineer", included: true }, { label: "Lighting", included: true }, { label: "Backline", included: true }, { label: "Stage Plot", included: true }], equipmentProvided: ["Full PA", "Monitors", "Lighting rig", "Drum kit", "Bass amp"], contactName: "Liam Bradley", contactEmail: "liam@electricballroom.co.uk", contactPhone: "+44 7700 900789", notes: "Headline slot. Full production.", cancellationPolicy: "7-day policy. 50% fee after that." },
];

const STATUS_TABS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "All", value: "all" }, { label: "Pending", value: "pending" }, { label: "Accepted", value: "accepted" }, { label: "Completed", value: "completed" }, { label: "Declined", value: "declined" },
];

function statusVariant(s: BookingStatus) {
  if (s === "accepted" || s === "completed") return "success" as const;
  if (s === "pending") return "warning" as const;
  return "destructive" as const;
}

export default function MusicianBookingsPage() {
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filtered = activeTab === "all" ? MOCK_BOOKINGS : MOCK_BOOKINGS.filter((b) => b.status === activeTab);

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-stone-900">Bookings</h1><p className="text-stone-500 mt-1">Review requests, accept gigs, and track your schedule.</p></div>
            <div className="flex items-center gap-2 text-sm"><span className="text-stone-500">Total earnings:</span><span className="font-bold text-stone-900">{formatMoney(MOCK_BOOKINGS.filter((b) => b.status === "accepted" || b.status === "completed").reduce((s, b) => s + b.fee, 0))}</span></div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {STATUS_TABS.map((tab) => (<button key={tab.value} onClick={() => setActiveTab(tab.value)} className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${activeTab === tab.value ? "border-olive-500 bg-olive-100 text-olive-700" : "border-stone-200 text-stone-500 hover:border-stone-300"}`}>{tab.label}</button>))}
          </div>

          <div className="space-y-4">
            {filtered.map((booking) => {
              const fees = calculateMarketplaceFees(booking.fee, { currency: booking.currency });
              const open = expandedId === booking.id;
              return (
                <Card key={booking.id}>
                  <button type="button" className="w-full text-left" onClick={() => setExpandedId(open ? null : booking.id)}>
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1"><h3 className="font-semibold text-stone-900 truncate">{booking.title}</h3><Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>{booking.source === "job_application" && <Badge variant="secondary">Via application</Badge>}</div>
                          <p className="text-sm text-stone-600">{booking.venue}</p>
                          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-stone-500"><span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{booking.date}</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{booking.time}</span><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{booking.venueAddress}</span></div>
                        </div>
                        <div className="flex items-center gap-3"><span className="text-lg font-bold text-stone-900">{formatMoney(booking.fee, booking.currency)}</span>{open ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}</div>
                      </div>
                    </CardContent>
                  </button>
                  {open && (
                    <CardContent className="border-t border-line px-5 pb-5 pt-4">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div><h4 className="text-sm font-semibold text-stone-900 mb-3">Event Information</h4><dl className="space-y-2 text-sm"><div className="flex justify-between"><dt className="text-stone-500">Event type</dt><dd className="font-medium">{booking.eventType}</dd></div><div className="flex justify-between"><dt className="text-stone-500">Audience</dt><dd className="font-medium flex items-center gap-1"><Users className="h-3 w-3" />{booking.audienceSize}</dd></div><div className="flex justify-between"><dt className="text-stone-500">Load-in</dt><dd className="font-medium">{booking.loadInTime}</dd></div><div className="flex justify-between"><dt className="text-stone-500">Soundcheck</dt><dd className="font-medium">{booking.soundcheckTime}</dd></div></dl>{booking.notes && <p className="mt-3 text-sm text-stone-600 bg-sand-100 rounded-lg p-3">{booking.notes}</p>}</div>
                        <div><h4 className="text-sm font-semibold text-stone-900 mb-3">Payment Details</h4><dl className="space-y-2 text-sm"><div className="flex justify-between"><dt className="text-stone-500">Performance fee</dt><dd className="font-medium">{formatMoney(fees.performanceFee, fees.currency)}</dd></div><div className="flex justify-between"><dt className="text-stone-500">StageLynk fee ({(fees.platformFeeRate * 100).toFixed(0)}%)</dt><dd className="text-stone-400">−{formatMoney(fees.platformFeeAmount, fees.currency)}</dd></div><div className="flex justify-between"><dt className="text-stone-500">Processing est.</dt><dd className="text-stone-400">−{formatMoney(fees.processorFeeEstimate, fees.currency)}</dd></div>{booking.depositAmount > 0 && <div className="flex justify-between"><dt className="text-stone-500">Deposit</dt><dd className="font-medium">{formatMoney(booking.depositAmount, booking.currency)}</dd></div>}<hr className="border-line" /><div className="flex justify-between"><dt className="font-semibold text-stone-900">Your payout</dt><dd className="font-bold text-brand">{formatMoney(fees.artistPayoutAmount, fees.currency)}</dd></div></dl>{booking.cancellationPolicy && <p className="mt-3 text-xs text-stone-400">{booking.cancellationPolicy}</p>}</div>
                        <div><h4 className="text-sm font-semibold text-stone-900 mb-3">Required Services</h4><ul className="space-y-1.5">{booking.requiredServices.map((svc) => (<li key={svc.label} className="flex items-start gap-2 text-sm">{svc.included ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-stone-300 mt-0.5 shrink-0" />}<div><span className={svc.included ? "text-stone-700" : "text-stone-400"}>{svc.label}</span>{svc.notes && <span className="ml-1 text-xs text-stone-400">— {svc.notes}</span>}</div></li>))}</ul>{booking.equipmentProvided.length > 0 && <div className="mt-3"><span className="text-xs font-medium text-stone-500">Equipment provided:</span><div className="flex flex-wrap gap-1.5 mt-1">{booking.equipmentProvided.map((e) => <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>)}</div></div>}</div>
                        <div><h4 className="text-sm font-semibold text-stone-900 mb-3">Venue Contact</h4><dl className="space-y-2 text-sm"><div className="flex items-center gap-2 text-stone-600"><User className="h-3.5 w-3.5" />{booking.contactName}</div><div className="flex items-center gap-2 text-stone-600"><Mail className="h-3.5 w-3.5" />{booking.contactEmail}</div><div className="flex items-center gap-2 text-stone-600"><Phone className="h-3.5 w-3.5" />{booking.contactPhone}</div></dl></div>
                      </div>
                      {booking.status === "pending" && <div className="mt-5 flex gap-3 border-t border-line pt-4"><Button size="sm"><CheckCircle2 className="mr-1 h-4 w-4" /> Accept</Button><Button size="sm" variant="outline"><XCircle className="mr-1 h-4 w-4" /> Decline</Button></div>}
                      {booking.status === "accepted" && <div className="mt-5 flex gap-3 border-t border-line pt-4"><Button size="sm" variant="outline"><Mic2 className="mr-1 h-4 w-4" /> Mark Completed</Button></div>}
                    </CardContent>
                  )}
                </Card>
              );
            })}
            {filtered.length === 0 && <div className="text-center py-16 text-stone-400"><Calendar className="mx-auto h-10 w-10 mb-3" /><p>No bookings matching this filter.</p></div>}
          </div>
        </div>
      </main>
    </div>
  );
}
