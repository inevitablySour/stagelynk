import { serializePaymentPlan } from "@/lib/booking-payment-plan";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MusicianBookingsManager } from "@/components/dashboard/musician-bookings-manager";
import type { BookingServiceRequirement } from "@/types";

export default async function MusicianBookingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) redirect("/musician");

  const bookings = await prisma.booking.findMany({
    where: { musicianId: musician.id },
    include: { venue: { select: { venueName: true } }, milestones: { orderBy: { order: "asc" } } },
    orderBy: { eventDate: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">Bookings</h1>
            <p className="text-stone-500 mt-1">Review requests, accept gigs, and track your schedule.</p>
          </div>

          <MusicianBookingsManager
            bookings={bookings.map((b) => ({
              id: b.id,
              title: b.title,
              eventType: b.eventType,
              venueName: b.venue.venueName,
              venueAddress: b.venueAddress,
              eventDate: b.eventDate.toISOString(),
              startTime: b.startTime,
              endTime: b.endTime,
              fee: b.fee,
              currency: b.currency,
              depositAmount: b.depositAmount,
              audienceSize: b.audienceSize,
              loadInTime: b.loadInTime,
              soundcheckTime: b.soundcheckTime,
              status: b.status,
              source: b.source,
              paymentStatus: b.paymentStatus,
              requiredServices: Array.isArray(b.requiredServices) ? (b.requiredServices as unknown as BookingServiceRequirement[]) : [],
              equipmentProvided: Array.isArray(b.equipmentProvided) ? (b.equipmentProvided as string[]) : [],
              contactName: b.contactName,
              contactEmail: b.contactEmail,
              contactPhone: b.contactPhone,
              notes: b.notes,
              cancellationPolicy: b.cancellationPolicy,
              negotiationStatus: b.negotiationStatus,
              proposedFee: b.proposedFee,
              proposedByUserId: b.proposedByUserId,
              plan: serializePaymentPlan(b),
              responseDeadline: b.responseDeadline?.toISOString() ?? null,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
