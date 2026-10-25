import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { artistCallInclude, serializeArtistCall } from "@/lib/artist-calls";
import { ArtistCallManager } from "@/components/dashboard/artist-call-manager";

export default async function PostOpenCallPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) redirect("/musician");

  const calls = await prisma.artistOpenCall.findMany({
    where: { posterId: musician.id }, include: { ...artistCallInclude, applications: { orderBy: { createdAt: "desc" }, include: { applicant: { select: { id: true, stageName: true } } } } }, orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-2xl font-bold text-stone-900">Post Open Call</h1>
          <ArtistCallManager
            calls={calls.map(serializeArtistCall)}
            applicants={Object.fromEntries(calls.map((c) => [c.id, c.applications.map((a) => ({ id: a.id, musicianId: a.applicant.id, stageName: a.applicant.stageName, conversationId: a.conversationId }))]))}
          />
        </div>
      </main>
    </div>
  );
}
