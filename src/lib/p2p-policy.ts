import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { DEFAULT_PLATFORM_FEE_RATE } from "@/lib/marketplace-fees";
import { P2P_PLATFORM_FEE_RATE } from "@/lib/p2p-fees";

/**
 * Guardrails that keep the reduced P2P fee for genuine collaboration, so a
 * venue can't route its bookings through a second, artist-role account.
 * None of these is airtight on its own; together they make evasion cost more
 * than the fee it saves.
 */
export const MIN_PAYER_ACCOUNT_AGE_DAYS = 14;
export const P2P_VOLUME_CAP = Number(process.env.P2P_VOLUME_CAP ?? 2000);
export const P2P_VOLUME_WINDOW_DAYS = 90;

export type P2PFeeReason = "reduced" | "card_shared_with_venue" | "volume_cap";

const DAY_MS = 86_400_000;

/** Records a card's fingerprint against the account that saved it. */
export async function recordCardFingerprint(userId: string, ownerRole: "musician" | "venue", fingerprint: string | null | undefined) {
  if (!fingerprint) return;
  await prisma.cardFingerprint.upsert({
    where: { fingerprint_userId: { fingerprint, userId } },
    create: { fingerprint, userId, ownerRole },
    update: {},
  });
}

/** Saves the fingerprints of every card on a Stripe customer. */
export async function syncCustomerFingerprints(userId: string, ownerRole: "musician" | "venue", stripeCustomerId: string) {
  const methods = await stripe.paymentMethods.list({ customer: stripeCustomerId, type: "card" });
  await Promise.all(methods.data.map((pm) => recordCardFingerprint(userId, ownerRole, pm.card?.fingerprint)));
}

async function trailingPaidVolume(payerId: string, now: Date) {
  const since = new Date(now.getTime() - P2P_VOLUME_WINDOW_DAYS * DAY_MS);
  const [flat, milestones] = await Promise.all([
    prisma.p2PDeal.aggregate({ _sum: { rateAmount: true }, where: { payerId, dealType: "flat_fee", status: "completed", paidAt: { gte: since } } }),
    prisma.p2PMilestone.aggregate({ _sum: { amount: true }, where: { status: "paid", paidAt: { gte: since }, deal: { payerId } } }),
  ]);
  return (flat._sum.rateAmount ?? 0) + (milestones._sum.amount ?? 0);
}

/** Returns a user-facing reason this account can't pay a P2P deal yet, or null. */
export async function payerBlockReason(payerMusicianId: string, matchConversationId: string | null, now = new Date()): Promise<string | null> {
  const payer = await prisma.musicianProfile.findUnique({
    where: { id: payerMusicianId },
    select: { user: { select: { createdAt: true } }, _count: { select: { albums: true } } },
  });
  if (!payer) return "Payer profile not found.";
  const ageDays = (now.getTime() - payer.user.createdAt.getTime()) / DAY_MS;
  if (ageDays < MIN_PAYER_ACCOUNT_AGE_DAYS) {
    return `Accounts must be at least ${MIN_PAYER_ACCOUNT_AGE_DAYS} days old to pay for collaboration deals.`;
  }
  if (payer._count.albums === 0) {
    return "The paying artist needs at least one release in their portfolio before paying for a collaboration deal.";
  }
  if (matchConversationId) {
    const senders = await prisma.message.groupBy({ by: ["senderId"], where: { conversationId: matchConversationId } });
    if (senders.length < 2) return "Both artists need to have chatted before a deal can be paid.";
  }
  return null;
}

/** Picks the platform fee rate for a P2P charge. */
export async function resolveP2PFeeRate(params: {
  payerMusicianId: string;
  payerUserId: string;
  paymentMethodId: string;
  amount: number;
  now?: Date;
}): Promise<{ rate: number; reason: P2PFeeReason }> {
  const now = params.now ?? new Date();
  const pm = await stripe.paymentMethods.retrieve(params.paymentMethodId);
  const fingerprint = pm.card?.fingerprint ?? null;
  await recordCardFingerprint(params.payerUserId, "musician", fingerprint);

  if (fingerprint) {
    const shared = await prisma.cardFingerprint.findFirst({ where: { fingerprint, ownerRole: "venue" }, select: { id: true } });
    if (shared) return { rate: DEFAULT_PLATFORM_FEE_RATE, reason: "card_shared_with_venue" };
  }
  const volume = await trailingPaidVolume(params.payerMusicianId, now);
  if (volume + params.amount > P2P_VOLUME_CAP) return { rate: DEFAULT_PLATFORM_FEE_RATE, reason: "volume_cap" };
  return { rate: P2P_PLATFORM_FEE_RATE, reason: "reduced" };
}

/** Best-effort: remembers the card a venue just paid with. Never blocks payment. */
export async function recordVenueCard(venueId: string, paymentMethodId: string) {
  try {
    const [venue, pm] = await Promise.all([
      prisma.venueProfile.findUnique({ where: { id: venueId }, select: { userId: true } }),
      stripe.paymentMethods.retrieve(paymentMethodId),
    ]);
    if (venue) await recordCardFingerprint(venue.userId, "venue", pm.card?.fingerprint);
  } catch {
    // Fingerprinting is a fraud signal, not part of the payment itself.
  }
}
