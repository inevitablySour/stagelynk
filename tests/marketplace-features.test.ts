import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarDate, discoveryQuerySchema, includesTag, normalizeCategory } from "../src/lib/discovery-utils";
import { eventInstants, isCallOpen, effectiveBudget } from "../src/lib/open-call-utils";
import { validateCallForPublishing } from "../src/lib/open-call-validation";
import { compareEquipment, formatGapAlert } from "../src/lib/technical-gap";
import { computeWeightedRating } from "../src/lib/rating";
import { scoreApplication } from "../src/lib/application-fit";
import { jobApplicationSchema, jobListingSchema, musicianProfileSchema } from "../src/lib/validations";
import { rankBlindScout } from "../src/lib/blind-scout";
import type { MusicianProfile } from "../src/types";

test("discovery rejects invalid dates, ratings and numeric filters", () => {
  for (const filters of [{ minRating: 11 }, { minRating: "oops" }, { experienceMin: -1 }, { availableOn: "2026-02-30" }, { sortBy: "popularity" }]) assert.equal(discoveryQuerySchema.safeParse(filters).success, false);
  assert.equal(calendarDate.safeParse("2028-02-29").success, true);
  assert.equal(includesTag(["Electric Guitar"], "gUiTaR"), true);
  assert.equal(normalizeCategory("voice_actor"), "voice-actor");
  assert.equal(normalizeCategory("sound-engineer"), "sound-engineer");
});

test("profile categories, rates, favorites and image protocols are validated", () => {
  assert.equal(musicianProfileSchema.partial().parse({ primaryCategory: "sound_engineer" }).primaryCategory, "sound-engineer");
  for (const profile of [{ performanceFee: -1 }, { performanceFee: 1.001 }, { favorites: ["a", "b", "c", "d", "e"] }, { profileImage: "javascript:alert(1)" }]) assert.equal(musicianProfileSchema.partial().safeParse(profile).success, false);
});

test("event instants account for time zones and overnight gigs", () => {
  const event = eventInstants("2026-11-01", "23:00", "01:00", "Europe/Brussels");
  assert.equal(event.eventStartsAt.toISOString(), "2026-11-01T22:00:00.000Z");
  assert.equal(event.eventEndsAt.toISOString(), "2026-11-02T00:00:00.000Z");
  assert.throws(() => eventInstants("2026-03-29", "02:30", "04:00", "Europe/Brussels"), /daylight saving/);
  assert.throws(() => eventInstants("2026-10-25", "02:30", "04:00", "Europe/Brussels"), /daylight saving/);
  assert.throws(() => eventInstants("2026-11-01", "25:00", "01:00", "Europe/Brussels"));
});

test("publishing requires a complete future schedule, stage brief, genre and budget", () => {
  const now = new Date("2026-01-01");
  const listing = {
    eventDate: new Date("2026-11-01"), startTime: "20:00", endTime: "23:00", timeZone: "Europe/Brussels",
    venueAddress: "1 Example Street", location: "Brussels", stageSpecs: "4m stage, mains power",
    budgetMin: 100, budgetMax: 300, applicationDeadline: new Date("2026-10-25"), genres: ["jazz"],
  };
  assert.ok(validateCallForPublishing(listing, now).eventEndsAt);
  for (const overrides of [{ stageSpecs: "" }, { genres: [] }, { budgetMin: 0 }, { budgetMax: 50 }, { eventDate: null }, { applicationDeadline: new Date("2026-11-02") }]) assert.throws(() => validateCallForPublishing({ ...listing, ...overrides }, now));
  assert.equal(jobListingSchema.safeParse({ title: "Test call", description: "A sufficiently long call description", eventType: "Live", slots: [{ label: "Opener", budgetMin: 200, budgetMax: 100 }] }).success, false);
});

test("deadlines close at the exact boundary and paused calls are unavailable", () => {
  const now = new Date("2026-10-16T12:00:00Z");
  assert.equal(isCallOpen({ status: "published", applicationDeadline: now }, now), false);
  assert.equal(isCallOpen({ status: "paused", applicationDeadline: null }, now), false);
  assert.equal(isCallOpen({ status: "published", applicationDeadline: null, eventStartsAt: now }, now), false);
  assert.deepEqual(effectiveBudget({ budgetMin: 200, budgetMax: 400 }, { budgetMin: 100, budgetMax: 500 }), { budgetMin: 200, budgetMax: 400 });
});

test("application allows a short optional message but requires availability and positive fees", () => {
  assert.equal(jobApplicationSchema.safeParse({ availabilityConfirmed: true, proposedFee: 150 }).success, true);
  assert.equal(jobApplicationSchema.safeParse({ coverMessage: "hello", availabilityConfirmed: true }).success, true);
  assert.equal(jobApplicationSchema.safeParse({ availabilityConfirmed: false }).success, false);
  assert.equal(jobApplicationSchema.safeParse({ availabilityConfirmed: true, proposedFee: 0 }).success, false);
});

test("technical gaps compare quantities rather than equipment presence", () => {
  const needs = [{ equipmentId: "mic", quantity: 3, equipment: { name: "Vocal Microphone", category: "Sound" } }];
  const gaps = compareEquipment(needs, [{ equipmentId: "mic", quantity: 2 }]);
  assert.equal(gaps[0].shortfall, 1);
  assert.equal(formatGapAlert(gaps), "Missing: 1 Vocal Microphone. Artist must supply.");
  assert.deepEqual(compareEquipment(needs, [{ equipmentId: "mic", quantity: 3 }]), []);
});

test("weighted rating rewards established consistent reviews", () => {
  assert.ok(computeWeightedRating(4.8, 50) > computeWeightedRating(5, 1));
  assert.equal(computeWeightedRating(0, 0), 0);
});

test("application fit uses supplied event gaps rather than querying permanent venue equipment", async () => {
  const base = { musicianId: "a", venueId: "v", listingGenreSlugs: ["jazz"], artistGenreSlugs: ["jazz"], proposedFee: 200, budgetMin: 100, budgetMax: 300 };
  assert.equal((await scoreApplication({ ...base, technicalGaps: [] })).overall, 1);
  assert.ok((await scoreApplication({ ...base, technicalGaps: [{ equipmentId: "mic", name: "Mic", category: "Sound", quantityNeeded: 1, quantityAvailable: 0, shortfall: 1 }] })).overall < 1);
});

test("Blind Scout prefers playable work over empty albums, not review counts", () => {
  const base = { genres: [], discography: [], rating: 0, reviewCount: 0 } as unknown as MusicianProfile;
  const artists = [
    { ...base, id: "established", rating: 5, reviewCount: 100, discography: [{ tracks: [] }] },
    { ...base, id: "emerging", discography: [{ tracks: [{ previewUrl: "https://example.test/raw.mp3" }] }] },
  ] as MusicianProfile[];
  assert.equal(rankBlindScout(artists, [])[0].id, "emerging");
});
