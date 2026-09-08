import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/common/star-rating";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";

const MOCK_REVIEWS = [
  { id: "r1", reviewer: "Sarah Mitchell", organisation: "The Warehouse Club", rating: 5, comment: "Incredible set — the crowd was electric from start to finish. Will definitely book again!", date: "Nov 15, 2025", project: "Friday Night Live" },
  { id: "r2", reviewer: "James Cooper", organisation: "Rooftop Bar London", rating: 4, comment: "Great performance with professional setup. Sound quality was excellent.", date: "Oct 2, 2025", project: "Rooftop Sunset Session" },
  { id: "r3", reviewer: "Liam Bradley", organisation: "Electric Ballroom", rating: 5, comment: "Nova read the room perfectly and kept the energy building all night. Full production, zero issues.", date: "Sep 18, 2025", project: "Electric Ballroom Headline" },
  { id: "r4", reviewer: "Priya Patel", organisation: "Acme Studios", rating: 4, comment: "Professional, punctual, and delivered exactly what was briefed. Would recommend.", date: "Aug 5, 2025", project: "Corporate Launch Event" },
];

const avgRating = MOCK_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / MOCK_REVIEWS.length;

export default function MusicianReviewsPage() {
  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6"><h1 className="text-2xl font-bold text-stone-900">Reviews</h1><p className="text-stone-500 mt-1">See what clients have said about your work.</p></div>

          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-stone-900">{avgRating.toFixed(1)}</p><StarRating rating={avgRating} size="sm" /><p className="text-xs text-stone-500 mt-1">Average rating</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-stone-900">{MOCK_REVIEWS.length}</p><p className="text-xs text-stone-500">Total reviews</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-stone-900">{MOCK_REVIEWS.filter((r) => r.rating === 5).length}</p><p className="text-xs text-stone-500">5-star reviews</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>All Reviews</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {MOCK_REVIEWS.map((review) => (
                <div key={review.id} className="border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div><span className="font-medium text-sm text-stone-900">{review.reviewer}</span><span className="text-xs text-stone-400 ml-2">— {review.organisation}</span></div>
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
