import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rankP2PCandidates, type P2PCandidate } from "@/lib/p2p-matching";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.musicianProfile.findUnique({
    where: { userId: session.user.id },
    include: { genrePicks: { include: { subtype: true } } },
  });
  if (!me) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const myQuestionnaire = await prisma.p2PQuestionnaireResponse.findUnique({ where: { musicianId: me.id } });

  const [existingMatches, candidateProfiles] = await Promise.all([
    prisma.p2PMatch.findMany({
      where: { OR: [{ musicianAId: me.id }, { musicianBId: me.id }] },
      select: { musicianAId: true, musicianBId: true },
    }),
    prisma.musicianProfile.findMany({
      where: { id: { not: me.id }, user: { deletedAt: null } },
      include: {
        genrePicks: { include: { subtype: true } },
        categoryPicks: { include: { subtype: true, instrumentType: true } },
        p2pQuestionnaireResponse: true,
      },
      take: 100,
    }),
  ]);

  const excludedIds = new Set<string>();
  for (const m of existingMatches) {
    excludedIds.add(m.musicianAId === me.id ? m.musicianBId : m.musicianAId);
  }

  const candidates: P2PCandidate[] = candidateProfiles
    .filter((p) => !excludedIds.has(p.id))
    .map((p) => ({
      musicianId: p.id,
      genreSlugs: p.genrePicks.map((pick) => pick.subtype.slug),
      answers: (p.p2pQuestionnaireResponse?.answers as Record<string, string | string[] | null>) ?? null,
    }));

  const ranked = await rankP2PCandidates(
    me.id,
    candidates,
    me.genrePicks.map((pick) => pick.subtype.slug),
    (myQuestionnaire?.answers as Record<string, string | string[] | null>) ?? null
  );

  const byId = new Map(candidateProfiles.map((p) => [p.id, p]));
  const data = ranked.map((r) => {
    const profile = byId.get(r.musicianId)!;
    return {
      musicianId: profile.id,
      stageName: profile.stageName,
      profileImage: profile.profileImage,
      location: profile.location,
      roles: [...new Set(profile.categoryPicks.map((pick) => pick.instrumentType?.name ?? pick.subtype.name))],
      genres: profile.genrePicks.map((pick) => pick.customLabel ?? pick.subtype.name),
      fit: { equipmentFit: r.equipmentFit, genreFit: r.genreFit, questionnaireFit: r.questionnaireFit },
    };
  });

  return NextResponse.json({ success: true, data });
}
