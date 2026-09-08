import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/common/star-rating";
import { Button } from "@/components/ui/button";
import { DASHBOARD_NAV_VENUE } from "@/config";

const MOCK_REVIEWS = [
  { id: "r1", creative: "Nova Eclipse", rating: 5, comment: "Incredible set — the crowd was electric from start to finish. Will definitely book again!", date: "Nov 15, 2025", project: "Friday Night Live" },
  { id: "r2", creative: "The Velvet Tongues", rating: 4, comment: "Great energy and very professional. Minor sound issue during setup but resolved quickly.", date: "Oct 20, 2025", project: "Saturday Soul Night" },
  { id: "r3", creative: "Maya Chen", rating: 5, comment: "Elegant performance, perfect for our corporate event. Highly recommended.", date: "Sep 10, 2025", project: "Annual Gala Dinner" },
];

const pendingReviews = [
  { id: "p1", creative: "Riot Signal", project: "Punk Night Takeover", date: "Apr 28, 2026" },
];

export default function VenueReviewsPage() {
  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6"><h1 className="text-2xl font-bold text-stone-900">Reviews</h1><p className="text-stone-500 mt-1">Reviews you&apos;ve left for creatives after completed bookings.</p></div>

          {/* Pending reviews */}
          {pendingReviews.length > 0 && (
            <Card className="mb-6 border-accent/30">
              <CardHeader><CardTitle>Pending Reviews</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {pendingReviews.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-3">
                    <div><h4 className="font-medium text-stone-900">{p.creative}</h4><p className="text-xs text-stone-500">{p.project} · {p.date}</p></div>
                    <Button size="sm">Write Review</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-stone-900">{MOCK_REVIEWS.length}</p><p className="text-xs text-stone-500">Reviews given</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-stone-900">{pendingReviews.length}</p><p className="text-xs text-stone-500">Awaiting review</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Your Reviews</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {MOCK_REVIEWS.map((review) => (
                <div key={review.id} className="border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div><span className="font-medium text-sm text-stone-900">{review.creative}</span></div>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  <p className="text-sm text-stone-500 mb-1">Project: {review.project}</p>
                  <p className="text-sm text-stone-600">{review.comment}</p>
                  <span className="mt-1 block text-xs text-stone-400">{review.date}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
