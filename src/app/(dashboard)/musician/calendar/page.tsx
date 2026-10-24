import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookingCalendar } from "@/components/calendar/booking-calendar";

export default async function MusicianCalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) redirect("/onboarding/role");

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">Calendar</h1>
            <p className="mt-1 text-stone-500">Your bookings, project due dates, and availability in one view.</p>
          </div>
          <BookingCalendar role="musician" />
        </div>
      </main>
    </div>
  );
}
