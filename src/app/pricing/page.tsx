import Link from "next/link";
import { CheckCircle2, Sparkles, DollarSign, Percent, Megaphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { APP_NAME } from "@/config";
import { formatMoney, calculateMarketplaceFees } from "@/lib/marketplace-fees";

export const metadata = { title: "Pricing" };

const exampleFees = [100, 300, 500, 1000].map((fee) => ({ fee, ...calculateMarketplaceFees(fee) }));

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-page">
        <section className="section-raised py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-14">
              <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">Simple, transparent pricing</h1>
              <p className="mt-4 text-lg text-stone-500">Creatives join free. {APP_NAME} takes a 5% fee on completed bookings — no subscriptions, no hidden costs.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              <Card>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-olive-100 text-olive-600"><Sparkles className="h-5 w-5" /></div>
                  <CardTitle className="mt-3">For Creatives</CardTitle>
                  <div className="mt-2"><span className="text-4xl font-extrabold text-stone-900">Free</span></div>
                  <CardDescription>Always free to join and use</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {["Create your profile & portfolio", "Apply to unlimited projects", "Get discovered by clients worldwide", "Receive bookings & build your reputation", "Connect Spotify, demo reels, & portfolios", "Receive 100% of your quoted fee"].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-stone-600"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button className="w-full" size="lg" asChild><Link href="/register">Join free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                </CardContent>
              </Card>

              <Card className="relative border-brand/35 shadow-[0_24px_65px_-36px_rgba(47,59,29,0.55)] ring-2 ring-brand">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge>How we earn</Badge></div>
                <CardHeader className="pt-8">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-surface"><Percent className="h-5 w-5" /></div>
                  <CardTitle className="mt-3">5% Transaction Fee</CardTitle>
                  <div className="mt-2"><span className="text-4xl font-extrabold text-stone-900">5%</span><span className="text-base text-stone-500"> per booking</span></div>
                  <CardDescription>Only when money moves</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {["Charged only on completed paid bookings", "Fee added on top of the creative's rate", "Payment processing fees shown separately", "Full breakdown before you confirm", "No monthly plans or commitments", "Refund protection built in"].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-stone-600"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button className="w-full" size="lg" asChild><Link href="/register">Get started <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-copper-100 text-copper-600"><Megaphone className="h-5 w-5" /></div>
                  <CardTitle className="mt-3">Paid Boosts</CardTitle>
                  <div className="mt-2"><span className="text-4xl font-extrabold text-stone-900">Optional</span></div>
                  <CardDescription>Pay only for what you need</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {["Promote job listings in search results", "Time-based boosts (7 or 30 days)", "View-based packs (500 or 2,000 impressions)", "Homepage featured placement", "Track views, clicks, and click-through rate", "Buy only when you need more visibility"].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-stone-600"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button className="w-full" size="lg" variant="outline" asChild><Link href="/register">View boost options</Link></Button>
                </CardContent>
              </Card>
            </div>

            {/* Fee calculator */}
            <div className="panel-soft mt-16 mx-auto max-w-3xl p-8">
              <div className="flex items-center gap-3 mb-6"><DollarSign className="h-6 w-6 text-brand" /><h3 className="text-lg font-semibold text-stone-900">Fee calculator</h3></div>
              <p className="text-sm text-stone-500 mb-4">See exactly what you&apos;ll pay at different booking amounts.</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {exampleFees.map((ex) => (
                  <Card key={ex.fee}><CardContent className="p-4">
                    <p className="text-xs text-stone-500 mb-1">Creative&apos;s fee</p>
                    <p className="text-xl font-bold text-stone-900">{formatMoney(ex.fee)}</p>
                    <hr className="my-2 border-line" />
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-stone-500">Platform fee (5%)</span><span>{formatMoney(ex.platformFeeAmount)}</span></div>
                      <div className="flex justify-between"><span className="text-stone-500">Processing est.</span><span>{formatMoney(ex.processorFeeEstimate)}</span></div>
                      <div className="flex justify-between font-semibold text-stone-900"><span>Client pays</span><span>{formatMoney(ex.totalChargeAmount)}</span></div>
                      <div className="flex justify-between font-semibold text-brand"><span>Creative receives</span><span>{formatMoney(ex.artistPayoutAmount)}</span></div>
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="panel-soft mt-20 mx-auto max-w-2xl p-8">
              <h2 className="text-2xl font-bold text-center text-stone-900 mb-8">Frequently asked questions</h2>
              <div className="space-y-6">
                {[
                  { q: "Do creatives pay anything to join?", a: `No. ${APP_NAME} is completely free for creatives. You create your profile, apply to projects, and get booked at no cost.` },
                  { q: "How does the 5% fee work?", a: "The 5% platform fee is added on top of the creative's quoted rate and paid by the client. For example, if a creative quotes £500, the client pays £525 (plus processing). The creative receives their full £500." },
                  { q: "Are there any subscriptions?", a: "No mandatory subscriptions. The platform earns through the 5% transaction fee on completed bookings. Optional paid boosts are available for clients who want extra visibility." },
                  { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards. Enterprise clients can pay by invoice." },
                  { q: "What are paid boosts?", a: "Clients can optionally pay to promote their job listings or profile in search results. Boosts are priced either by time (e.g. 7-day or 30-day) or by impressions (e.g. 500 or 2,000 views)." },
                  { q: "Can I get a refund?", a: "If a booking is cancelled before the event, refunds are handled according to the cancellation policy set on each booking. The platform fee is refunded in full on cancellations." },
                ].map((faq) => (
                  <div key={faq.q} className="border-b border-line pb-4 last:border-b-0 last:pb-0"><h3 className="font-medium text-stone-900">{faq.q}</h3><p className="mt-1 text-sm text-stone-500">{faq.a}</p></div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
