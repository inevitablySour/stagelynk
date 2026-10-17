import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/common/star-rating";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function MusicianReviewsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) redirect("/musician");

  const reviews = await prisma.review.findMany({
    where: { musicianId: musician.id },
    include: {
      reviewer: { include: { venueProfile: { select: { venueName: true } } } },
      booking: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const avgRating = musician.rating;
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">Reviews</h1>
            <p className="text-stone-500 mt-1">See what clients have said about your work.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-stone-900">{avgRating.toFixed(1)}</p>
                <StarRating rating={avgRating} size="sm" />
                <p className="text-xs text-stone-500 mt-1">Average rating</p>
              </CardContent>
            </Card>
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-stone-900">{reviews.length}</p><p className="text-xs text-stone-500">Total reviews</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-stone-900">{fiveStarCount}</p><p className="text-xs text-stone-500">5-star reviews</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>All Reviews</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {reviews.length === 0 && <p className="text-sm text-stone-500 text-center py-6">No reviews yet.</p>}
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-sm text-stone-900">{review.reviewer.name}</span>
                      {review.reviewer.venueProfile?.venueName && (
                        <span className="text-xs text-stone-400 ml-2">— {review.reviewer.venueProfile.venueName}</span>
                      )}
                    </div>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  <p className="text-sm text-stone-500 mb-1">Project: {review.booking.title}</p>
                  <p className="text-sm text-stone-600">{review.comment}</p>
                  <span className="mt-1 block text-xs text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
