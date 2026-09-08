import { Megaphone, Eye, MousePointerClick, Clock, Zap, Plus } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { formatMoney } from "@/lib/marketplace-fees";
import type { PromotionStatus } from "@/types";

const PRICING_OPTIONS = [
  { id: "p1", name: "7-Day Job Boost", placement: "Job listing", billingModel: "Time-based", price: 15, currency: "GBP", description: "Your job listing appears at the top of search results for 7 days." },
  { id: "p2", name: "30-Day Job Boost", placement: "Job listing", billingModel: "Time-based", price: 45, currency: "GBP", description: "Featured placement in job search results for a full month." },
  { id: "p3", name: "500 Impressions Pack", placement: "Artist search", billingModel: "View-based", price: 20, currency: "GBP", description: "Your venue appears in artist search results until 500 impressions are reached." },
  { id: "p4", name: "2,000 Impressions Pack", placement: "Artist search", billingModel: "View-based", price: 60, currency: "GBP", description: "High-visibility placement with up to 2,000 impressions across search and genre pages." },
  { id: "p5", name: "Homepage Featured Spot", placement: "Homepage", billingModel: "Time-based", price: 75, currency: "GBP", description: "Featured on the StageLynk homepage for 7 days. Maximum exposure." },
];

const MOCK_CAMPAIGNS = [
  { id: "c1", name: "DJ Residency – Job Boost", placement: "Job listing", billingModel: "Time-based", status: "active" as PromotionStatus, budgetAmount: 15, spentAmount: 15, currency: "GBP", startsAt: "Apr 28, 2026", endsAt: "May 5, 2026", views: 342, clicks: 28 },
  { id: "c2", name: "Venue Search Visibility", placement: "Artist search", billingModel: "View-based", status: "active" as PromotionStatus, budgetAmount: 20, spentAmount: 14, currency: "GBP", startsAt: "Apr 25, 2026", endsAt: undefined, views: 350, clicks: 18, viewLimit: 500 },
  { id: "c3", name: "NYE Gala – Homepage Feature", placement: "Homepage", billingModel: "Time-based", status: "completed" as PromotionStatus, budgetAmount: 75, spentAmount: 75, currency: "GBP", startsAt: "Dec 20, 2025", endsAt: "Dec 27, 2025", views: 1820, clicks: 145 },
];

function statusVariant(s: PromotionStatus) {
  if (s === "active") return "success" as const;
  if (s === "scheduled") return "warning" as const;
  if (s === "completed") return "secondary" as const;
  if (s === "draft") return "outline" as const;
  return "destructive" as const;
}

export default function VenuePromotionsPage() {
  const totalSpent = MOCK_CAMPAIGNS.reduce((s, c) => s + c.spentAmount, 0);
  const totalViews = MOCK_CAMPAIGNS.reduce((s, c) => s + c.views, 0);
  const totalClicks = MOCK_CAMPAIGNS.reduce((s, c) => s + c.clicks, 0);

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-stone-900">Promotions</h1><p className="text-stone-500 mt-1">Boost your job listings and venue visibility with paid placements.</p></div>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Campaign</Button>
          </div>

          {/* Summary stats */}
          <div className="grid gap-3 sm:grid-cols-4 mb-8">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{formatMoney(totalSpent)}</p><p className="text-xs text-stone-500">Total spent</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{totalViews.toLocaleString()}</p><p className="text-xs text-stone-500">Total views</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{totalClicks}</p><p className="text-xs text-stone-500">Total clicks</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0}%</p><p className="text-xs text-stone-500">Click rate</p></CardContent></Card>
          </div>

          {/* Active campaigns */}
          <Card className="mb-8">
            <CardHeader><CardTitle>Your Campaigns</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {MOCK_CAMPAIGNS.map((campaign) => (
                <div key={campaign.id} className="rounded-xl border border-stone-100 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1"><h3 className="font-semibold text-stone-900">{campaign.name}</h3><Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge></div>
                      <div className="flex flex-wrap gap-3 text-xs text-stone-500 mt-1">
                        <span className="flex items-center gap-1"><Megaphone className="h-3 w-3" />{campaign.placement}</span>
                        <span className="flex items-center gap-1">{campaign.billingModel === "Time-based" ? <Clock className="h-3 w-3" /> : <Zap className="h-3 w-3" />}{campaign.billingModel}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{campaign.views} views{campaign.viewLimit ? ` / ${campaign.viewLimit}` : ""}</span>
                        <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{campaign.clicks} clicks</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-stone-900">{formatMoney(campaign.spentAmount, campaign.currency)} / {formatMoney(campaign.budgetAmount, campaign.currency)}</p>
                      <p className="text-[10px] text-stone-400">{campaign.startsAt}{campaign.endsAt ? ` → ${campaign.endsAt}` : " → ongoing"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pricing options */}
          <h2 className="text-lg font-bold text-stone-900 mb-4">Available Boost Options</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRICING_OPTIONS.map((opt) => (
              <Card key={opt.id}>
                <CardHeader>
                  <div className="flex items-center gap-2"><Badge variant={opt.billingModel === "Time-based" ? "default" : "secondary"} className="text-[10px]">{opt.billingModel === "Time-based" ? <Clock className="mr-0.5 h-3 w-3" /> : <Zap className="mr-0.5 h-3 w-3" />}{opt.billingModel}</Badge><Badge variant="outline" className="text-[10px]">{opt.placement}</Badge></div>
                  <CardTitle className="text-base mt-2">{opt.name}</CardTitle>
                  <CardDescription>{opt.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-stone-900">{formatMoney(opt.price, opt.currency)}</span>
                    <Button size="sm">Buy Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
