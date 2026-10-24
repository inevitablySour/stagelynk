import Link from "next/link";
import { DollarSign, Megaphone, CheckCircle2, ArrowRight } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_NAME, DASHBOARD_NAV_VENUE } from "@/config";
import { formatMoney, calculateMarketplaceFees } from "@/lib/marketplace-fees";

const exampleFees = [300, 500, 1000].map((fee) => ({ fee, ...calculateMarketplaceFees(fee) }));

export default function VenueBillingPage() {
  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold text-stone-900">Billing & Fees</h1>
          <p className="mt-1 text-stone-500">Understand how {APP_NAME} pricing works for your bookings.</p>

          {/* How it works */}
          <Card className="mt-6 border-olive-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-olive-100 text-olive-600"><DollarSign className="h-6 w-6" /></div>
                <div>
                  <h2 className="font-semibold text-stone-900">5% transaction fee on completed bookings</h2>
                  <p className="text-sm text-stone-500">No subscriptions. You only pay when a booking is completed.</p>
                </div>
              </div>
              <ul className="space-y-2">
                {["The 5% fee is added on top of the creative's quoted rate", "Payment processing fees are shown separately", "Creatives receive 100% of their quoted fee", "Full fee breakdown is visible before you confirm any booking", "Platform fee is refunded if a booking is cancelled"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-stone-600"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />{f}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Fee examples */}
          <h2 className="text-lg font-semibold text-stone-900 mt-8 mb-4">Fee examples</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {exampleFees.map((ex) => (
              <Card key={ex.fee}><CardContent className="p-5">
                <p className="text-xs text-stone-500 mb-1">Creative&apos;s fee</p>
                <p className="text-2xl font-bold text-stone-900">{formatMoney(ex.fee)}</p>
                <hr className="my-3 border-line" />
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-stone-500">Platform fee (5%)</dt><dd>{formatMoney(ex.platformFeeAmount)}</dd></div>
                  <div className="flex justify-between"><dt className="text-stone-500">Processing est.</dt><dd>{formatMoney(ex.processorFeeEstimate)}</dd></div>
                  <hr className="border-line" />
                  <div className="flex justify-between font-semibold"><dt className="text-stone-900">You pay</dt><dd className="text-stone-900">{formatMoney(ex.totalChargeAmount)}</dd></div>
                  <div className="flex justify-between font-semibold"><dt className="text-brand">Creative receives</dt><dd className="text-brand">{formatMoney(ex.artistPayoutAmount)}</dd></div>
                </dl>
              </CardContent></Card>
            ))}
          </div>

          {/* Boost upsell */}
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-copper-100 text-copper-600"><Megaphone className="h-5 w-5" /></div>
                <div><CardTitle>Want more visibility?</CardTitle><CardDescription>Boost your job listings with optional paid promotions.</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {["Promoted job listings appear at the top of search", "Choose time-based or view-based pricing", "Track performance with views, clicks, and conversions"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-stone-600"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />{f}</li>
                ))}
              </ul>
              <Button asChild><Link href="/venue/promotions">Manage promotions <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <Button variant="ghost" asChild><Link href="/pricing">View full pricing details</Link></Button>
          </div>
        </div>
      </main>
    </div>
  );
}
