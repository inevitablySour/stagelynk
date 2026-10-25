/**
 * Records the card fingerprints of every existing venue/artist Stripe
 * customer so the P2P fee guardrail can spot a card shared with a venue.
 * Run once after the card_fingerprints migration:
 *   npx tsx scripts/backfill-card-fingerprints.ts
 */
import { prisma } from "../src/lib/db";
import { syncCustomerFingerprints } from "../src/lib/p2p-policy";

async function main() {
  const venues = await prisma.venueProfile.findMany({ where: { stripeCustomerId: { not: null } }, select: { userId: true, stripeCustomerId: true } });
  const artists = await prisma.musicianProfile.findMany({ where: { stripeCustomerId: { not: null } }, select: { userId: true, stripeCustomerId: true } });
  for (const v of venues) await syncCustomerFingerprints(v.userId, "venue", v.stripeCustomerId!);
  for (const a of artists) await syncCustomerFingerprints(a.userId, "musician", a.stripeCustomerId!);
  console.log(`Recorded cards for ${venues.length} venues and ${artists.length} artists.`);
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
