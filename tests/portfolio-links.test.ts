import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLink, portfolioKindsFor, sectionsFor } from "../src/lib/portfolio-links";
import { socialLinksSchema } from "../src/lib/validations";
import { seededShuffle } from "../src/lib/discovery-utils";

test("link sets follow the artist's category groups", () => {
  assert.deepEqual(portfolioKindsFor([]), ["music"]);
  assert.deepEqual(portfolioKindsFor(["film-audiovisual-crew"]), ["film"]);
  assert.deepEqual(portfolioKindsFor(["music-audio-production", "film-audiovisual-crew"]), ["music", "film"]);
  const keys = sectionsFor(["music", "film"]).flatMap((s) => s.keys);
  assert.equal(new Set(keys).size, keys.length, "shared fields appear once");
  assert.ok(keys.includes("bandcamp") && keys.includes("imdb") && keys.includes("frameio"));
});

test("links are normalised to safe web addresses", () => {
  assert.equal(normalizeLink("instagram", "@artist"), "https://instagram.com/artist");
  assert.equal(normalizeLink("website", "example.com/portfolio"), "https://example.com/portfolio");
  assert.equal(normalizeLink("website", "javascript:alert(1)"), "");
  assert.equal(normalizeLink("imdb", "   "), "");
  assert.equal(socialLinksSchema.safeParse({ bandcamp: "javascript:alert(1)" }).success, false);
  const parsed = socialLinksSchema.parse({ letterboxd: "letterboxd.com/me", instagram: "@me" });
  assert.equal(parsed.letterboxd, "https://letterboxd.com/me");
  assert.equal(parsed.instagram, "https://instagram.com/me");
});

test("a seeded shuffle is stable for one visit and differs between visits", () => {
  const items = Array.from({ length: 30 }, (_, i) => i);
  assert.deepEqual(seededShuffle(items, 7), seededShuffle(items, 7));
  assert.notDeepEqual(seededShuffle(items, 7), seededShuffle(items, 8));
  assert.deepEqual([...seededShuffle(items, 7)].sort((a, b) => a - b), items);
});
