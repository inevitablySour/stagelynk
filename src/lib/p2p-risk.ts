import { prisma } from "@/lib/db";
import { MIN_PAYER_ACCOUNT_AGE_DAYS, P2P_VOLUME_CAP, P2P_VOLUME_WINDOW_DAYS } from "@/lib/p2p-policy";

export interface P2PRiskRow {
  musicianId: string;
  stageName: string;
  email: string | null;
  accountAgeDays: number;
  releases: number;
  volume: number;
  deals: number;
  distinctPayees: number;
  cardSharedWithVenue: boolean;
  flags: string[];
}

const DAY_MS = 86_400_000;

/** Artists who paid for P2P deals recently, with the signals that suggest venue-style use. */
export async function listP2PRisk(now = new Date()): Promise<P2PRiskRow[]> {
  const since = new Date(now.getTime() - P2P_VOLUME_WINDOW_DAYS * DAY_MS);
  const [deals, milestones] = await Promise.all([
    prisma.p2PDeal.findMany({ where: { dealType: "flat_fee", status: "completed", paidAt: { gte: since }, payerId: { not: null } }, select: { payerId: true, payeeId: true, rateAmount: true } }),
    prisma.p2PMilestone.findMany({ where: { status: "paid", paidAt: { gte: since } }, select: { amount: true, deal: { select: { payerId: true, payeeId: true } } } }),
  ]);

  const byPayer = new Map<string, { volume: number; deals: number; payees: Set<string> }>();
  const add = (payerId: string | null, payeeId: string | null, amount: number) => {
    if (!payerId) return;
    const entry = byPayer.get(payerId) ?? { volume: 0, deals: 0, payees: new Set<string>() };
    entry.volume += amount; entry.deals += 1; if (payeeId) entry.payees.add(payeeId);
    byPayer.set(payerId, entry);
  };
  deals.forEach((d) => add(d.payerId, d.payeeId, d.rateAmount ?? 0));
  milestones.forEach((m) => add(m.deal.payerId, m.deal.payeeId, m.amount));
  if (byPayer.size === 0) return [];

  const payers = await prisma.musicianProfile.findMany({
    where: { id: { in: [...byPayer.keys()] } },
    select: { id: true, stageName: true, userId: true, user: { select: { email: true, createdAt: true } }, _count: { select: { albums: true } } },
  });
  const fingerprints = await prisma.cardFingerprint.findMany({ where: { userId: { in: payers.map((p) => p.userId) }, ownerRole: "musician" }, select: { fingerprint: true, userId: true } });
  const shared = await prisma.cardFingerprint.findMany({ where: { fingerprint: { in: fingerprints.map((f) => f.fingerprint) }, ownerRole: "venue" }, select: { fingerprint: true } });
  const venueFingerprints = new Set(shared.map((s) => s.fingerprint));
  const sharedUsers = new Set(fingerprints.filter((f) => venueFingerprints.has(f.fingerprint)).map((f) => f.userId));

  return payers.map((p) => {
    const stats = byPayer.get(p.id)!;
    const accountAgeDays = Math.floor((now.getTime() - p.user.createdAt.getTime()) / DAY_MS);
    const flags: string[] = [];
    if (sharedUsers.has(p.userId)) flags.push("Card also saved on a venue account");
    if (p._count.albums === 0) flags.push("No portfolio releases");
    if (accountAgeDays < MIN_PAYER_ACCOUNT_AGE_DAYS) flags.push(`Account under ${MIN_PAYER_ACCOUNT_AGE_DAYS} days old`);
    if (stats.deals >= 2 && stats.payees.size === 1) flags.push("Only ever pays one person");
    if (stats.volume > P2P_VOLUME_CAP) flags.push(`Over €${P2P_VOLUME_CAP} in ${P2P_VOLUME_WINDOW_DAYS} days`);
    return {
      musicianId: p.id, stageName: p.stageName, email: p.user.email, accountAgeDays, releases: p._count.albums,
      volume: stats.volume, deals: stats.deals, distinctPayees: stats.payees.size, cardSharedWithVenue: sharedUsers.has(p.userId), flags,
    };
  }).sort((a, b) => b.flags.length - a.flags.length || b.volume - a.volume);
}
