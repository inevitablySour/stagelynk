import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OpenCallsManager } from "@/components/dashboard/open-calls-manager";
import { openCallInclude, serializeCall } from "@/lib/open-calls";

export default async function VenueJobsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!venue) redirect("/venue");

  const listings = await prisma.jobListing.findMany({
    where: { venueId: venue.id },
    include: openCallInclude,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <OpenCallsManager listings={listings.map(serializeCall)} />
        </div>
      </main>
    </div>
  );
}
