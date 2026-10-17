import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MusicianJobsBrowser } from "@/components/dashboard/musician-jobs-browser";
import { listOpenCalls } from "@/lib/open-calls";

export default async function MusicianJobsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) redirect("/musician");

  const [jobs, applications] = await Promise.all([
    listOpenCalls({}, musician.id),
    prisma.jobApplication.findMany({
      where: { musicianId: musician.id },
      select: { jobListingId: true },
    }),
  ]);


  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">Open Gigs</h1>
            <p className="text-stone-500 mt-1">Browse opportunities posted by venues and apply directly.</p>
          </div>

          <MusicianJobsBrowser jobs={jobs} appliedJobIds={applications.map((a) => a.jobListingId)} quotedFee={musician.performanceFee} />
        </div>
      </main>
    </div>
  );
}
