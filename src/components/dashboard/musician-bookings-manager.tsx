"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, Users, Phone, Mail, User, ChevronDown, ChevronUp, CheckCircle2, XCircle, Mic2, Handshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, calculateMarketplaceFees } from "@/lib/marketplace-fees";
import type { BookingStatus } from "@/types";

export interface BookingRow {
  id: string;
  title: string;
  eventType: string;
  venueName: string;
  venueAddress: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  fee: number;
  currency: string;
  depositAmount: number;
  audienceSize: number | null;
  loadInTime: string | null;
  soundcheckTime: string | null;
  status: BookingStatus;
  source: string;
  paymentStatus?: string;
  requiredServices: { label: string; included: boolean; notes?: string }[];
  equipmentProvided: string[];
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  cancellationPolicy: string | null;
  negotiationStatus?: string;
  proposedFee?: number | null;
  proposedByUserId?: string | null;
  responseDeadline?: string | null;
}

const STATUS_TABS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Completed", value: "completed" },
  { label: "Declined", value: "declined" },
];

function statusVariant(s: BookingStatus) {
  if (s === "accepted" || s === "completed") return "success" as const;
  if (s === "pending") return "warning" as const;
  return "destructive" as const;
}

export function MusicianBookingsManager({ bookings }: { bookings: BookingRow[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rows, setRows] = useState(bookings);
  const [counterInputs, setCounterInputs] = useState<Record<string, string>>({});
  const [showCounterForm, setShowCounterForm] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = activeTab === "all" ? rows : rows.filter((b) => b.status === activeTab);

  const act = async (id: string, action: "accept" | "decline" | "complete" | "counter", counterFee?: number) => {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(counterFee !== undefined ? { counterFee } : {}) }),
      });
      const json = await res.json();
      if (json.success) {
        setRows((prev) =>
          prev.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: json.data.status,
                  negotiationStatus: json.data.negotiationStatus,
                  proposedFee: json.data.proposedFee,
                  proposedByUserId: json.data.proposedByUserId,
                  responseDeadline: json.data.responseDeadline,
                  fee: json.data.fee,
                }
              : b
          )
        );
        setShowCounterForm(null);
        router.refresh();
      } else {
        setActionError(json.message ?? "That action couldn't be completed.");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 text-sm mb-4">
        <span className="text-stone-500">Total earnings:</span>
        <span className="font-bold text-stone-900">
          {formatMoney(rows.filter((b) => b.status === "accepted" || b.status === "completed").reduce((s, b) => s + b.fee, 0))}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.value ? "border-olive-500 bg-olive-100 text-olive-700" : "border-stone-200 text-stone-500 hover:border-stone-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-stone-900 truncate">{booking.title}</h3>
                        <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
                        {booking.source === "job_application" && <Badge variant="secondary">Via application</Badge>}
                      </div>
                      <p className="text-sm text-stone-600">{booking.venueName}</p>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(booking.eventDate).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{booking.startTime} – {booking.endTime}</span>
                        {booking.venueAddress && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{booking.venueAddress}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-stone-900">{formatMoney(booking.fee, booking.currency)}</span>
                      {open ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
                    </div>
                  </div>
                </CardContent>
              </button>
              {open && (
                <CardContent className="border-t border-line px-5 pb-5 pt-4">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold text-stone-900 mb-3">Event Information</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between"><dt className="text-stone-500">Event type</dt><dd className="font-medium">{booking.eventType}</dd></div>
                        {booking.audienceSize != null && (
                          <div className="flex justify-between"><dt className="text-stone-500">Audience</dt><dd className="font-medium flex items-center gap-1"><Users className="h-3 w-3" />{booking.audienceSize}</dd></div>
                        )}
                        {booking.loadInTime && <div className="flex justify-between"><dt className="text-stone-500">Load-in</dt><dd className="font-medium">{booking.loadInTime}</dd></div>}
                        {booking.soundcheckTime && <div className="flex justify-between"><dt className="text-stone-500">Soundcheck</dt><dd className="font-medium">{booking.soundcheckTime}</dd></div>}
                      </dl>
                      {booking.notes && <p className="mt-3 text-sm text-stone-600 bg-sand-100 rounded-lg p-3">{booking.notes}</p>}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-stone-900 mb-3">Payment Details</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between"><dt className="text-stone-500">Performance fee</dt><dd className="font-medium">{formatMoney(fees.performanceFee, fees.currency)}</dd></div>
                        <div className="flex justify-between"><dt className="text-stone-500">StageLynk fee ({(fees.platformFeeRate * 100).toFixed(0)}%)</dt><dd className="text-stone-400">−{formatMoney(fees.platformFeeAmount, fees.currency)}</dd></div>
                        <div className="flex justify-between"><dt className="text-stone-500">Processing est.</dt><dd className="text-stone-400">−{formatMoney(fees.processorFeeEstimate, fees.currency)}</dd></div>
                        {booking.depositAmount > 0 && <div className="flex justify-between"><dt className="text-stone-500">Deposit</dt><dd className="font-medium">{formatMoney(booking.depositAmount, booking.currency)}</dd></div>}
                        <hr className="border-line" />
                        <div className="flex justify-between"><dt className="font-semibold text-stone-900">Your payout</dt><dd className="font-bold text-brand">{formatMoney(fees.artistPayoutAmount, fees.currency)}</dd></div>
                      </dl>
                      {booking.cancellationPolicy && <p className="mt-3 text-xs text-stone-400">{booking.cancellationPolicy}</p>}
                    </div>
                    {booking.requiredServices.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-stone-900 mb-3">Required Services</h4>
                        <ul className="space-y-1.5">
                          {booking.requiredServices.map((svc) => (
                            <li key={svc.label} className="flex items-start gap-2 text-sm">
                              {svc.included ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-stone-300 mt-0.5 shrink-0" />}
                              <div>
                                <span className={svc.included ? "text-stone-700" : "text-stone-400"}>{svc.label}</span>
                                {svc.notes && <span className="ml-1 text-xs text-stone-400">— {svc.notes}</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                        {booking.equipmentProvided.length > 0 && (
                          <div className="mt-3">
                            <span className="text-xs font-medium text-stone-500">Equipment provided:</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {booking.equipmentProvided.map((e) => <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {(booking.contactName || booking.contactEmail || booking.contactPhone) && (
                      <div>
                        <h4 className="text-sm font-semibold text-stone-900 mb-3">Venue Contact</h4>
                        <dl className="space-y-2 text-sm">
                          {booking.contactName && <div className="flex items-center gap-2 text-stone-600"><User className="h-3.5 w-3.5" />{booking.contactName}</div>}
                          {booking.contactEmail && <div className="flex items-center gap-2 text-stone-600"><Mail className="h-3.5 w-3.5" />{booking.contactEmail}</div>}
                          {booking.contactPhone && <div className="flex items-center gap-2 text-stone-600"><Phone className="h-3.5 w-3.5" />{booking.contactPhone}</div>}
                        </dl>
                      </div>
                    )}
                  </div>
                  {actionError && expandedId === booking.id && (
                    <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
                  )}
                  {booking.source === "job_application" && booking.status === "pending" && booking.paymentStatus !== "paid" && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">The client is completing payment for this application. This is not a confirmed booking yet; no acceptance is needed from you.</p>}

                  {booking.source === "direct_request" && booking.negotiationStatus === "counter_pending" && booking.proposedByUserId && (
                    <div className="mt-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <Handshake className="h-4 w-4 shrink-0" />
                      You countered with {formatMoney(booking.proposedFee ?? booking.fee, booking.currency)}. Waiting on the venue&apos;s response.
                      {booking.responseDeadline && (
                        <span className="ml-auto text-xs text-amber-600">
                          Expires {new Date(booking.responseDeadline).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}

                  {booking.source === "direct_request" && booking.negotiationStatus === "pending_response" && (
                    <div className="mt-5 border-t border-line pt-4">
                      {booking.responseDeadline && (
                        <p className="mb-3 text-xs text-stone-400">
                          Respond by {new Date(booking.responseDeadline).toLocaleString()} or this request expires automatically.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <Button size="sm" onClick={() => act(booking.id, "accept")} disabled={busyId === booking.id}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => act(booking.id, "decline")} disabled={busyId === booking.id}>
                          <XCircle className="mr-1 h-4 w-4" /> Decline
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowCounterForm(showCounterForm === booking.id ? null : booking.id)}
                          disabled={busyId === booking.id}
                        >
                          <Handshake className="mr-1 h-4 w-4" /> Counter
                        </Button>
                      </div>
                      {showCounterForm === booking.id && (
                        <div className="mt-3 flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            placeholder={`Your counter (${booking.currency})`}
                            className="max-w-[200px]"
                            value={counterInputs[booking.id] ?? ""}
                            onChange={(e) => setCounterInputs((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const value = Number(counterInputs[booking.id]);
                              if (value > 0) act(booking.id, "counter", value);
                            }}
                            disabled={busyId === booking.id || !counterInputs[booking.id]}
                          >
                            Send counter
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {booking.source === "job_application" && booking.status === "pending" && booking.paymentStatus === "paid" && (
                    <div className="mt-5 flex gap-3 border-t border-line pt-4">
                      <p className="text-sm text-muted">Payment has been received. This booking is awaiting reconciliation; it does not need a second acceptance.</p>
                    </div>
                  )}

                  {booking.status === "accepted" && (
                    <div className="mt-5 flex gap-3 border-t border-line pt-4">
                      <Button size="sm" variant="outline" onClick={() => act(booking.id, "complete")} disabled={busyId === booking.id}>
                        <Mic2 className="mr-1 h-4 w-4" /> Mark Completed
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <Calendar className="mx-auto h-10 w-10 mb-3" />
            <p>No bookings matching this filter.</p>
          </div>
        )}
      </div>
    </>
  );
}
