"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookingPaymentStep } from "@/components/artists/booking-payment-step";
import { formatMoney } from "@/lib/marketplace-fees";
import { planPayment, DEFAULT_DEPOSIT_PERCENT } from "@/lib/payment-structures";
import { APP_NAME } from "@/config";

interface BookingRequestFormProps {
  musicianId: string;
  stageName: string;
}

type Step = "details" | "payment" | "sent";

export function BookingRequestForm({ musicianId, stageName }: BookingRequestFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [fee, setFee] = useState("");
  const [useDeposit, setUseDeposit] = useState(false);
  const [venueAddress, setVenueAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feeNumber = Number(fee);
  const hasValidFee = fee.length > 0 && Number.isFinite(feeNumber) && feeNumber > 0;
  const plan = hasValidFee ? planPayment({ structure: useDeposit ? "deposit_balance" : "full_sum", fee: feeNumber, currency: "EUR", depositPercent: DEFAULT_DEPOSIT_PERCENT }) : null;
  const breakdown = plan?.first ?? null;

  async function handleContinueToPayment() {
    setError(null);
    if (!eventDate || !startTime || !endTime || !hasValidFee) {
      setError("Date, start/end time, and a valid fee are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/stripe/setup-intent", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to start payment setup.");
        return;
      }
      setClientSecret(json.clientSecret);
      setStep("payment");
    } catch {
      setError("Unable to start payment setup.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaymentConfirmed(paymentMethodId: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musicianId,
          eventDate,
          startTime,
          endTime,
          venueAddress: venueAddress || undefined,
          notes: notes || undefined,
          fee: feeNumber,
          paymentStructure: useDeposit ? "deposit_balance" : "full_sum",
          depositPercent: DEFAULT_DEPOSIT_PERCENT,
          paymentMethodId,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to send booking request.");
        return;
      }
      setStep("sent");
    } catch {
      setError("Unable to send booking request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "sent") {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <h2 className="text-lg font-semibold text-stone-900">Booking request sent!</h2>
          <p className="mt-2 text-sm text-stone-500">
            {stageName} has 48 hours to accept, decline, or counter-offer. A hold has been placed on your
            card and will only be charged if they accept.
          </p>
          <Button className="mt-6" onClick={() => router.push("/venue/bookings")}>
            View my bookings
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {step === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>Booking details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Event date</label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Start time</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">End time</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Venue address</label>
              <Input placeholder="Where's the gig?" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Performance fee (EUR)</label>
              <Input type="number" min="0" step="0.01" placeholder="e.g. 300" value={fee} onChange={(e) => setFee(e.target.value)} />
              <p className="mt-1 text-xs text-stone-400">
                This is what {stageName} will receive. Platform and processing fees are added on top and paid by you.
              </p>
              <label className="mt-3 flex items-start gap-2 text-sm text-stone-700">
                <input type="checkbox" className="mt-1" checked={useDeposit} onChange={(e) => setUseDeposit(e.target.checked)} />
                <span>Pay a {DEFAULT_DEPOSIT_PERCENT}% deposit now and the balance about 48 hours before the event.</span>
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Notes (optional)</label>
              <Input placeholder="Anything the artist should know" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {breakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Cost breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">Booking fee ({stageName})</dt>
                <dd className="font-medium text-stone-900">{formatMoney(breakdown.performanceFee, breakdown.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">{APP_NAME} platform fee ({(breakdown.platformFeeRate * 100).toFixed(0)}%)</dt>
                <dd className="text-stone-700">{formatMoney(breakdown.platformFeeAmount, breakdown.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Payment processing fee (estimate)</dt>
                <dd className="text-stone-700">{formatMoney(breakdown.processorFeeEstimate, breakdown.currency)}</dd>
              </div>
              <hr className="border-line" />
              {plan && plan.balanceFee > 0 && (
                <div className="flex justify-between text-stone-500">
                  <dt>Balance, charged ~48h before the event</dt>
                  <dd>{formatMoney(plan.balanceFee, "EUR")} + fees</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="font-semibold text-stone-900">{useDeposit ? "Deposit hold on your card" : "Total hold on your card"}</dt>
                <dd className="font-bold text-stone-900">{formatMoney(breakdown.totalChargeAmount, breakdown.currency)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-stone-400">
              This places a hold on your card — you&apos;re only actually charged if {stageName} accepts. They
              have 48 hours to accept, decline, or counter-offer; if they don&apos;t respond, the hold is
              released automatically. The processing fee is Stripe&apos;s estimate and may vary slightly
              depending on your card.
            </p>
          </CardContent>
        </Card>
      )}

      {step === "details" && (
        <Button className="w-full" onClick={handleContinueToPayment} disabled={submitting || !breakdown}>
          {submitting ? "Loading..." : "Continue to payment"}
        </Button>
      )}

      {step === "payment" && clientSecret && (
        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <BookingPaymentStep
              clientSecret={clientSecret}
              onConfirmed={handlePaymentConfirmed}
              onCancel={() => setStep("details")}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
