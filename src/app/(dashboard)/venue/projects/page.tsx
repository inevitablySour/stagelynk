import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VenueProjectsManager } from "@/components/dashboard/venue-projects-manager";

export default async function VenueProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const venue = await prisma.venueProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!venue) redirect("/onboarding/role");

  const listings = await prisma.projectListing.findMany({
    where: { venueId: venue.id },
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <VenueProjectsManager
            listings={listings.map((l) => ({
              id: l.id,
              title: l.title,
              deadline: l.deadline?.toISOString() ?? null,
              budgetMin: l.budgetMin,
              budgetMax: l.budgetMax,
              hideBudget: l.hideBudget,
              currency: l.currency,
              status: l.status,
              _count: l._count,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
