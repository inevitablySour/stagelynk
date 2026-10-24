import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookingCalendar } from "@/components/calendar/booking-calendar";

export default async function VenueCalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!venue) redirect("/onboarding/role");

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">Calendar</h1>
            <p className="mt-1 text-stone-500">Bookings, project deadlines, and quick project creation in one view.</p>
          </div>
          <BookingCalendar role="venue" />
        </div>
      </main>
    </div>
  );
}
