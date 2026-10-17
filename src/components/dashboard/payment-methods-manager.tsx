"use client";

import { useEffect, useState } from "react";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingPaymentStep } from "@/components/artists/booking-payment-step";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
}

export function PaymentMethodsManager() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadMethods() {
    setLoading(true);
    try {
      const res = await fetch("/api/venues/me/payment-methods");
      const json = await res.json();
      if (json.success) {
        setMethods(json.data.paymentMethods);
        setDefaultId(json.data.defaultPaymentMethodId);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => loadMethods());
  }, []);

  async function startAdding() {
    setError(null);
    const res = await fetch("/api/stripe/setup-intent", { method: "POST" });
    const json = await res.json();
    if (!json.success) {
      setError(json.message ?? "Unable to start payment setup.");
      return;
    }
    setClientSecret(json.clientSecret);
    setAdding(true);
  }

  async function handleConfirmed(paymentMethodId: string) {
    await fetch("/api/venues/me/payment-methods", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethodId }),
    });
    setAdding(false);
    setClientSecret(null);
    await loadMethods();
  }

  async function makeDefault(paymentMethodId: string) {
    await fetch("/api/venues/me/payment-methods", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethodId }),
    });
    setDefaultId(paymentMethodId);
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Saved cards</CardTitle>
        <CardDescription>Used to charge Direct Hire bookings and accepted Open Call applications.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {!loading && methods.length === 0 && !adding && (
          <p className="text-sm text-stone-500">No payment method on file yet.</p>
        )}

        {methods.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-3">
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-stone-400" />
              <span className="text-sm text-stone-700">
                {m.brand.toUpperCase()} •••• {m.last4}
                {m.expMonth && m.expYear ? ` — exp ${m.expMonth}/${m.expYear}` : ""}
              </span>
            </div>
            {m.id === defaultId ? (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Default
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => makeDefault(m.id)}>
                Make default
              </Button>
            )}
          </div>
        ))}

        {adding && clientSecret ? (
          <BookingPaymentStep
            clientSecret={clientSecret}
            onConfirmed={handleConfirmed}
            onCancel={() => {
              setAdding(false);
              setClientSecret(null);
            }}
            helpText="Your card won't be charged now — this just saves it for future bookings."
            confirmLabel="Save card"
          />
        ) : (
          <Button onClick={startAdding}>Add a card</Button>
        )}
      </CardContent>
    </Card>
  );
}
