import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MusicianProjectsBrowser } from "@/components/dashboard/musician-projects-browser";

export default async function MusicianProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const musician = await prisma.musicianProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!musician) redirect("/onboarding/role");

  const listings = await prisma.projectListing.findMany({
    where: { status: "published", venue: { user: { deletedAt: null } } },
    include: { venue: { select: { venueName: true } }, applications: { where: { musicianId: musician.id } } },
    orderBy: { createdAt: "desc" },
  });

  const available = listings.filter((l) => l.applications.length === 0);

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">Projects</h1>
            <p className="mt-1 text-stone-500">Deliverable-based work — soundtracks, edits, mixes, and more.</p>
          </div>
          <MusicianProjectsBrowser
            projects={available.map((l) => ({
              id: l.id,
              title: l.title,
              description: l.description,
              venueName: l.venue.venueName,
              deadline: l.deadline?.toISOString() ?? null,
              budgetMin: l.hideBudget ? 0 : l.budgetMin,
              budgetMax: l.hideBudget ? 0 : l.budgetMax,
              hideBudget: l.hideBudget,
              currency: l.currency,
              genres: Array.isArray(l.genres) ? (l.genres as string[]) : [],
              applicantCount: 0,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
