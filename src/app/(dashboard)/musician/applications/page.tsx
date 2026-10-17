import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MusicianApplicationsManager } from "@/components/dashboard/musician-applications-manager";

export default async function MusicianApplicationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) redirect("/musician");

  const applications = await prisma.jobApplication.findMany({
    where: { musicianId: musician.id },
    include: { jobListing: { include: { venue: { select: { venueName: true } } } }, booking: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">My Applications</h1>
            <p className="text-stone-500 mt-1">Track the status of gig applications you&apos;ve submitted.</p>
          </div>

          <MusicianApplicationsManager
            applications={applications.map((a) => ({
              id: a.id,
              jobTitle: a.jobListing.title,
              venueName: a.jobListing.venue.venueName,
              location: a.jobListing.location,
              proposedFee: a.proposedFee,
              currency: a.jobListing.currency,
              status: a.status,
              appliedAt: a.createdAt.toISOString(),
              bookingId: a.booking?.id ?? null,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
