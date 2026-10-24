import { redirect } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MatchSuggestions } from "@/components/p2p/match-suggestions";
import { MatchesList, type MatchRow } from "@/components/p2p/matches-list";

export default async function P2PDiscoverPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) redirect("/onboarding/role");

  const matches = await prisma.p2PMatch.findMany({
    where: { OR: [{ musicianAId: musician.id }, { musicianBId: musician.id }] },
    include: {
      musicianA: { select: { id: true, stageName: true, profileImage: true } },
      musicianB: { select: { id: true, stageName: true, profileImage: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const matchRows: MatchRow[] = matches.map((m) => {
    const other = m.musicianAId === musician.id ? m.musicianB : m.musicianA;
    return {
      id: m.id,
      status: m.status,
      otherMusician: other,
      isInitiator: m.initiatedBy === musician.id,
      conversationId: m.conversationId,
    };
  });

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <div className="flex-1 lg:pl-0">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Collaborate</h1>
              <p className="mt-1 text-stone-500">Find other creatives to work with directly — no platform fee.</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/musician/p2p/questionnaire">Compatibility questionnaire</Link>
            </Button>
          </div>

          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-stone-900">Suggestions</h2>
            <MatchSuggestions />
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-stone-900">Your matches</h2>
            <MatchesList matches={matchRows} />
          </section>
        </div>
      </div>
    </div>
  );
}
