import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VenueReviewsManager } from "@/components/dashboard/venue-reviews-manager";

export default async function VenueReviewsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!venue) redirect("/venue");

  const [completedBookingsWithoutReview, reviews] = await Promise.all([
    prisma.booking.findMany({
      where: { venueId: venue.id, status: "completed", review: null },
      include: { musician: { select: { stageName: true } } },
      orderBy: { eventDate: "desc" },
    }),
    prisma.review.findMany({
      where: { reviewerId: session.user.id },
      include: { musician: { select: { stageName: true } }, booking: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">Reviews</h1>
            <p className="text-stone-500 mt-1">Reviews you&apos;ve left for creatives after completed bookings.</p>
          </div>

          <VenueReviewsManager
            pending={completedBookingsWithoutReview.map((b) => ({
              bookingId: b.id,
              musicianId: b.musicianId,
              musicianStageName: b.musician.stageName,
              projectTitle: b.title,
              eventDate: b.eventDate.toISOString(),
            }))}
            given={reviews.map((r) => ({
              id: r.id,
              musicianStageName: r.musician.stageName,
              projectTitle: r.booking.title,
              rating: r.rating,
              comment: r.comment,
              createdAt: r.createdAt.toISOString(),
            }))}
          />
        </div>
      </main>
    </div>
  );
}
