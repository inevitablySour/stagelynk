import { test, after, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { prisma } from "../src/lib/db";
import { stripe } from "../src/lib/stripe";
import { reserveOpenCall, chargeReservedCall, confirmOpenCallPayment, cancelReservedCall, reconcileOpenCallRefund } from "../src/lib/open-call-payments";
import { discoverArtists } from "../src/lib/discovery";
import { discoveryQuerySchema } from "../src/lib/discovery-utils";
import { eventInstants } from "../src/lib/open-call-utils";
import { listOpenCalls } from "../src/lib/open-calls";
import { POST as stripeWebhook } from "../src/app/api/stripe/webhook/route";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
if (enabled) {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.pathname.endsWith("_test"), "Integration tests require a loopback-only database ending in _test");
}
const userIds: string[] = [];
const venueIds: string[] = [];
const intents = new Map<string, Stripe.PaymentIntent>();
const createKeys = new Map<string, string>();
const confirmKeys = new Set<string>();
const refundKeys = new Set<string>();
if (enabled) {
  mock.method(stripe.paymentIntents, "create", async (params: Stripe.PaymentIntentCreateParams, options?: Stripe.RequestOptions) => {
    const key = options?.idempotencyKey ?? randomUUID();
    const existing = createKeys.get(key);
    if (existing) return intents.get(existing) as never;
    const id = `pi_fixture_${randomUUID()}`;
    const intent = { id, status: "requires_confirmation", amount: params.amount, amount_received: 0, currency: params.currency, metadata: params.metadata, client_secret: "fixture_not_a_real_secret" } as Stripe.PaymentIntent;
    createKeys.set(key, id); intents.set(id, intent);
    return intent as never;
  });
  mock.method(stripe.paymentIntents, "retrieve", async (id: string) => intents.get(id) as never);
  mock.method(stripe.paymentIntents, "confirm", async (id: string, _params?: Stripe.PaymentIntentConfirmParams, options?: Stripe.RequestOptions) => {
    confirmKeys.add(options?.idempotencyKey ?? id);
    const intent = intents.get(id)!;
    if (intent.status === "canceled") throw new Error("Cannot confirm a cancelled intent");
    intent.status = "succeeded"; intent.amount_received = intent.amount;
    return intent as never;
  });
  mock.method(stripe.paymentIntents, "cancel", async (id: string) => {
    const intent = intents.get(id)!;
    if (intent.status === "succeeded") throw new Error("Cannot cancel a succeeded intent");
    intent.status = "canceled"; return intent as never;
  });
  mock.method(stripe.refunds, "create", async (_params?: Stripe.RefundCreateParams, options?: Stripe.RequestOptions) => {
    refundKeys.add(options?.idempotencyKey ?? "");
    return { id: "re_fixture", status: "succeeded" } as never;
  });
}

async function fixture() {
  const venueUser = await prisma.user.create({ data: { email: `${randomUUID()}@integration.invalid`, role: "venue", venueProfile: { create: { venueName: "Fixture venue", stripeCustomerId: `cus_${randomUUID()}` } } }, include: { venueProfile: true } });
  const artists = await Promise.all([0, 1].map(async (index) => prisma.user.create({
    data: { email: `${randomUUID()}@integration.invalid`, role: "musician", musicianProfile: { create: { stageName: `Fixture ${index}`, primaryCategory: "sound_engineer", instruments: ["Electric Guitar"], subgenres: ["Dream pop"], performanceFee: 200, rating: 5, reviewCount: index ? 50 : 1, availabilitySlots: { create: { startDate: new Date("2099-11-01"), endDate: new Date("2099-11-02") } } } } },
    include: { musicianProfile: true },
  })));
  userIds.push(venueUser.id, ...artists.map((artist) => artist.id));
  const venue = venueUser.venueProfile!;
  venueIds.push(venue.id);
  const schedule = eventInstants("2099-11-01", "20:00", "23:00", "Europe/Brussels");
  const call = await prisma.jobListing.create({
    data: {
      venueId: venue.id, title: "Fixture call", description: "A full isolated test opportunity.", eventDate: new Date("2099-11-01"),
      startTime: "20:00", endTime: "23:00", timeZone: "Europe/Brussels", ...schedule,
      location: "Brussels", venueAddress: "1 Fixture Street", stageSpecs: "4m stage and mains power", genres: ["jazz"],
      budgetMin: 100, budgetMax: 300, status: "published", slots: { create: { label: "Performance" } },
    }, include: { slots: true },
  });
  const applications = await Promise.all(artists.map((artist) => prisma.jobApplication.create({
    data: { jobListingId: call.id, musicianId: artist.musicianProfile!.id, slotId: call.slots[0].id, proposedFee: 200, availabilityConfirmed: true },
  })));
  return { venue, artists: artists.map((artist) => artist.musicianProfile!), call, applications };
}

test("isolated PostgreSQL: discovery normalizes categories, instruments and weighted ordering, excluding deleted users", { skip: !enabled }, async () => {
  const data = await fixture();
  const results = await discoverArtists(discoveryQuerySchema.parse({ category: ["sound-engineer"], instrument: "gUiTaR" }));
  assert.ok(results.find((artist) => artist.id === data.artists[0].id));
  assert.ok(results.findIndex((artist) => artist.id === data.artists[1].id) < results.findIndex((artist) => artist.id === data.artists[0].id));
  await prisma.user.update({ where: { id: data.artists[0].userId }, data: { deletedAt: new Date() } });
  assert.equal((await discoverArtists(discoveryQuerySchema.parse({}))).some((artist) => artist.id === data.artists[0].id), false);
});

test("Stripe webhook rejects unsigned events before processing", async () => {
  const response = await stripeWebhook(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }));
  assert.equal(response.status, 400);
});

test("isolated PostgreSQL + mocked Stripe: stale expiry snapshot does not cancel the next payment attempt", { skip: !enabled }, async () => {
  const data = await fixture();
  const app = data.applications[0];
  const first = await reserveOpenCall(app.id, data.venue.id, 200, data.venue.stripeCustomerId!, "pm_fixture");
  await cancelReservedCall(app.id, data.venue.id);
  const second = await reserveOpenCall(app.id, data.venue.id, 200, data.venue.stripeCustomerId!, "pm_fixture");
  await cancelReservedCall(app.id, data.venue.id, { paymentAttempt: first.attempt, onlyIfExpired: true });
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: second.booking.id } });
  assert.equal(booking.status, "pending");
  assert.equal((await prisma.jobListingSlot.findUniqueOrThrow({ where: { id: app.slotId! } })).reservedByApplicationId, app.id);
});

test("isolated PostgreSQL + mocked Stripe: refund webhook repairs reservation then old replay cannot corrupt a newer paid booking", { skip: !enabled }, async () => {
  const data = await fixture();
  const app = data.applications[0];
  const first = await reserveOpenCall(app.id, data.venue.id, 200, data.venue.stripeCustomerId!, "pm_fixture");
  const oldId = `pi_fixture_${randomUUID()}`;
  await prisma.booking.update({ where: { id: first.booking.id }, data: { stripePaymentIntentId: oldId, paymentStatus: "refunded" } });
  await reconcileOpenCallRefund(first.booking.id, oldId, true);
  assert.equal((await prisma.jobListingSlot.findUniqueOrThrow({ where: { id: app.slotId! } })).reservedByApplicationId, null);
  assert.equal(await prisma.marketplaceTransaction.count({ where: { bookingId: first.booking.id, providerPaymentId: oldId, status: "refunded" } }), 1);
  const second = await reserveOpenCall(app.id, data.venue.id, 200, data.venue.stripeCustomerId!, "pm_fixture");
  await chargeReservedCall(second.booking, second.attempt);
  await reconcileOpenCallRefund(first.booking.id, oldId, true);
  const current = await prisma.booking.findUniqueOrThrow({ where: { id: second.booking.id } });
  assert.equal(current.paymentStatus, "paid");
  assert.equal(current.status, "accepted");
  const payload = JSON.stringify({ id: `evt_${randomUUID()}`, object: "event", type: "charge.refunded", data: { object: { id: "ch_fixture", payment_intent: oldId, metadata: {}, amount: 20000, amount_refunded: 20000 } } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  const response = await stripeWebhook(new Request("http://localhost/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": signature }, body: payload }));
  assert.equal(response.status, 200);
  assert.equal((await prisma.booking.findUniqueOrThrow({ where: { id: second.booking.id } })).paymentStatus, "paid");
});

test("isolated PostgreSQL: competing applicants cannot reserve the same lineup slot", { skip: !enabled }, async () => {
  const data = await fixture();
  const results = await Promise.allSettled(data.applications.map((app) => reserveOpenCall(app.id, data.venue.id, 200, data.venue.stripeCustomerId!, "pm_fixture")));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(await prisma.booking.count({ where: { venueId: data.venue.id } }), 1);
});

test("isolated PostgreSQL + mocked Stripe: same-application retries use one reservation, charge key and transaction", { skip: !enabled }, async () => {
  const data = await fixture();
  const app = data.applications[0];
  const [one, two] = await Promise.all([reserveOpenCall(app.id, data.venue.id, 200, data.venue.stripeCustomerId!, "pm_fixture"), reserveOpenCall(app.id, data.venue.id, 200, data.venue.stripeCustomerId!, "pm_fixture")]);
  assert.equal(one.booking.id, two.booking.id);
  assert.equal(one.attempt, two.attempt);
  const keysBefore = createKeys.size;
  const charges = await Promise.all([chargeReservedCall(one.booking, one.attempt), chargeReservedCall(two.booking, two.attempt)]);
  assert.ok(charges.every((result) => result.confirmed));
  assert.equal(createKeys.size - keysBefore, 1);
  assert.equal(await prisma.marketplaceTransaction.count({ where: { bookingId: one.booking.id } }), 1);
  const booked = await prisma.booking.findUniqueOrThrow({ where: { id: one.booking.id } });
  assert.equal(booked.status, "accepted");
  assert.equal(booked.payoutReleaseAt!.getTime(), data.call.eventEndsAt!.getTime() + 86400000);
  const intent = intents.get(booked.stripePaymentIntentId!)!;
  await confirmOpenCallPayment(booked.id, intent);
  assert.equal(await prisma.marketplaceTransaction.count({ where: { bookingId: booked.id } }), 1);
  assert.ok(confirmKeys.has(`open-call-${booked.id}-${one.attempt}-confirm`));
});

test("isolated PostgreSQL: reservation conflicts also remove artists from available-on discovery", { skip: !enabled }, async () => {
  const data = await fixture();
  await reserveOpenCall(data.applications[0].id, data.venue.id, 200, data.venue.stripeCustomerId!, "pm_fixture");
  const results = await discoverArtists(discoveryQuerySchema.parse({ availableOn: "2099-11-01" }));
  assert.equal(results.some((artist) => artist.id === data.artists[0].id), false);
  assert.equal(results.some((artist) => artist.id === data.artists[1].id), true);
});

test("isolated PostgreSQL + mocked Stripe: cancellation recovers even before intent persistence, and allows a fresh attempt", { skip: !enabled }, async () => {
  const data = await fixture();
  const app = data.applications[0];
  const reservation = await reserveOpenCall(app.id, data.venue.id, 200, data.venue.stripeCustomerId!, "pm_fixture");
  await cancelReservedCall(app.id, data.venue.id);
  assert.equal((await prisma.jobListingSlot.findUniqueOrThrow({ where: { id: app.slotId! } })).reservedByApplicationId, null);
  const next = await reserveOpenCall(app.id, data.venue.id, 200, data.venue.stripeCustomerId!, "pm_fixture");
  assert.equal(next.attempt, reservation.attempt + 1);
  assert.equal(next.booking.id, reservation.booking.id);
});

test("isolated PostgreSQL + mocked Stripe: expired funded attempts refund once and do not confirm the slot", { skip: !enabled }, async () => {
  const data = await fixture();
  const reservation = await reserveOpenCall(data.applications[0].id, data.venue.id, 200, data.venue.stripeCustomerId!, "pm_fixture");
  const id = `pi_fixture_${randomUUID()}`;
  const intent = { id, status: "succeeded", amount: Math.round(reservation.booking.totalChargeAmount * 100), amount_received: Math.round(reservation.booking.totalChargeAmount * 100), currency: "eur", metadata: { bookingId: reservation.booking.id } } as unknown as Stripe.PaymentIntent;
  intents.set(id, intent);
  await prisma.booking.update({ where: { id: reservation.booking.id }, data: { stripePaymentIntentId: id, responseDeadline: new Date(0) } });
  const count = refundKeys.size;
  await confirmOpenCallPayment(reservation.booking.id, intent);
  await confirmOpenCallPayment(reservation.booking.id, intent);
  assert.equal(refundKeys.size - count, 1);
  const result = await prisma.booking.findUniqueOrThrow({ where: { id: reservation.booking.id } });
  assert.equal(result.paymentStatus, "refunded");
  assert.equal(result.status, "cancelled");
  assert.equal((await prisma.jobListingSlot.findUniqueOrThrow({ where: { id: data.call.slots[0].id } })).filled, false);
});

test("isolated PostgreSQL: range filters require one slot to overlap both bounds", { skip: !enabled }, async () => {
  const data = await fixture();
  await prisma.jobListingSlot.update({ where: { id: data.call.slots[0].id }, data: { budgetMin: 100, budgetMax: 200 } });
  await prisma.jobListingSlot.create({ data: { jobListingId: data.call.id, label: "Headliner", budgetMin: 900, budgetMax: 1000 } });
  const results = await listOpenCalls({ minBudget: 400, maxBudget: 600 });
  assert.equal(results.some((call) => call.id === data.call.id), false);
});

after(async () => {
  if (enabled) {
    await prisma.booking.deleteMany({ where: { venueId: { in: venueIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  mock.restoreAll();
  await prisma.$disconnect();
});
