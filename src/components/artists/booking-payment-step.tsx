"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { getStripeClient } from "@/lib/stripe-client";

interface BookingPaymentStepProps {
  clientSecret: string;
  onConfirmed: (paymentMethodId: string) => void;
  onCancel: () => void;
  helpText?: string;
  confirmLabel?: string;
}

function PaymentForm({
  onConfirmed,
  onCancel,
  helpText = "Your card will only be charged if the artist accepts this booking.",
  confirmLabel = "Save card & send request",
}: Omit<BookingPaymentStepProps, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!stripe || !elements) return;
    setError(null);
    setIsConfirming(true);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Please check your card details.");
      setIsConfirming(false);
      return;
    }

    const { error: setupError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (setupError || !setupIntent?.payment_method) {
      setError(setupError?.message ?? "Unable to save payment method.");
      setIsConfirming(false);
      return;
    }

    const paymentMethodId =
      typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method.id;

    onConfirmed(paymentMethodId);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">{helpText}</p>
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleConfirm} disabled={isConfirming || !stripe}>
          {isConfirming ? "Saving..." : confirmLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isConfirming}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function BookingPaymentStep({ clientSecret, onConfirmed, onCancel, helpText, confirmLabel }: BookingPaymentStepProps) {
  return (
    <Elements stripe={getStripeClient()} options={{ clientSecret }}>
      <PaymentForm onConfirmed={onConfirmed} onCancel={onCancel} helpText={helpText} confirmLabel={confirmLabel} />
    </Elements>
  );
}
