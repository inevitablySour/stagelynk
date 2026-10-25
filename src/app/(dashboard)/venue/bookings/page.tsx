import { serializePaymentPlan } from "@/lib/booking-payment-plan";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VenueBookingsManager } from "@/components/dashboard/venue-bookings-manager";

export default async function VenueBookingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!venue) redirect("/venue");

  const bookings = await prisma.booking.findMany({
    where: { venueId: venue.id },
    include: { musician: { select: { stageName: true } }, milestones: { orderBy: { order: "asc" } } },
    orderBy: { eventDate: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <VenueBookingsManager
            bookings={bookings.map((b) => ({
              id: b.id,
              artist: b.musician.stageName,
              eventType: b.eventType,
              eventDate: b.eventDate.toISOString(),
              startTime: b.startTime,
              endTime: b.endTime,
              fee: b.fee,
              currency: b.currency,
              status: b.status,
              payoutStatus: b.payoutStatus,
              source: b.source,
              paymentStatus: b.paymentStatus,
              audienceSize: b.audienceSize,
              negotiationStatus: b.negotiationStatus,
              proposedFee: b.proposedFee,
              plan: serializePaymentPlan(b),
            }))}
          />
        </div>
      </main>
    </div>
  );
}
