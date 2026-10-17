"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/marketplace-fees";
import type { PayoutStatus } from "@/types";

interface PayoutRow {
  id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  scheduledFor: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface PayoutsManagerProps {
  stripeOnboardingComplete: boolean;
  stripePayoutsEnabled: boolean;
  payouts: PayoutRow[];
}

const STATUS_VARIANT: Record<PayoutStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  scheduled: "outline",
  paid: "default",
  failed: "destructive",
  cancelled: "secondary",
};

function OnboardingBanner() {
  const searchParams = useSearchParams();
  const onboardingComplete = searchParams.get("onboarding") === "complete";
  const error = searchParams.get("error");

  if (onboardingComplete) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4" /> Stripe account connected. It may take a few minutes for payouts to be fully enabled.
      </p>
    );
  }

  if (error === "onboarding_failed") {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        <AlertCircle className="h-4 w-4" /> Something went wrong starting Stripe onboarding. Please try again.
      </p>
    );
  }

  return null;
}

export function PayoutsManager({ stripeOnboardingComplete, stripePayoutsEnabled, payouts }: PayoutsManagerProps) {
  return (
    <div className="mt-6 space-y-6">
      <Suspense fallback={null}>
        <OnboardingBanner />
      </Suspense>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-olive-100 text-olive-600">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Payout account</CardTitle>
              <CardDescription>
                Earnings from bookings are paid out to this account after the event date.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {stripePayoutsEnabled ? (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Payouts enabled
            </p>
          ) : stripeOnboardingComplete ? (
            <p className="text-sm text-stone-500">
              Account details submitted. Stripe is finishing verification — this can take a few minutes.
            </p>
          ) : (
            <p className="text-sm text-stone-500">
              You need to connect a payout account before you can accept paid bookings.
            </p>
          )}
          <Button asChild>
            <a href="/api/stripe/connect/onboard">
              {stripeOnboardingComplete ? "Manage payout account" : "Connect payout account"}
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-stone-500">No payouts yet.</p>
          ) : (
            <div className="space-y-2">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between rounded-lg border border-stone-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {formatMoney(payout.amount, payout.currency)}
                    </p>
                    <p className="text-xs text-stone-500">
                      {payout.paidAt
                        ? `Paid ${new Date(payout.paidAt).toLocaleDateString()}`
                        : payout.scheduledFor
                          ? `Scheduled for ${new Date(payout.scheduledFor).toLocaleDateString()}`
                          : `Created ${new Date(payout.createdAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[payout.status]}>{payout.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
