import { test } from "node:test";
import assert from "node:assert/strict";
import { spotifyEmbedUrl } from "../src/lib/spotify-embed";
import { promotionDraftSchema, promotionTotals } from "../src/lib/promotions";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SpotifyPlayer } from "../src/components/artists/spotify-player";

test("Spotify embeds accept only HTTPS Spotify album or track URLs", () => {
  assert.equal(spotifyEmbedUrl("https://open.spotify.com/album/4Lkkfpt8ZkDmw4viHHi0IM?si=ignored"), "https://open.spotify.com/embed/album/4Lkkfpt8ZkDmw4viHHi0IM?theme=0");
  assert.equal(spotifyEmbedUrl("https://open.spotify.com/intl-en/track/0123456789012345678901"), "https://open.spotify.com/embed/track/0123456789012345678901?theme=0");
  for (const value of [undefined, "javascript:alert(1)", "https://open.spotify.com.evil.test/album/4Lkkfpt8ZkDmw4viHHi0IM", "http://open.spotify.com/album/4Lkkfpt8ZkDmw4viHHi0IM", "https://open.spotify.com/album/invalid", "https://user:password@open.spotify.com/album/4Lkkfpt8ZkDmw4viHHi0IM"]) {
    assert.equal(spotifyEmbedUrl(value), null);
  }
});

test("Spotify is rendered automatically without a load step or native player", () => {
  const html = renderToStaticMarkup(createElement(SpotifyPlayer, { url: "https://open.spotify.com/album/4Lkkfpt8ZkDmw4viHHi0IM", title: "Pitbull reference" }));
  assert.ok(html.includes("<iframe"));
  assert.ok(html.includes("https://open.spotify.com/embed/album/4Lkkfpt8ZkDmw4viHHi0IM"));
  assert.equal(html.includes("<button"), false);
  assert.equal(html.includes("<audio"), false);
  assert.equal(renderToStaticMarkup(createElement(SpotifyPlayer, { url: "https://untrusted.test/audio", title: "Invalid" })), "");
});

test("empty promotions produce honest zero metrics", () => {
  assert.deepEqual(promotionTotals([]), { spend: [], views: 0, clicks: 0, clickRate: 0 });
});

test("promotion metrics come from recorded counters and retain separate currencies", () => {
  const result = promotionTotals([
    { spentAmount: 12, currency: "EUR", views: 100, clicks: 7 },
    { spentAmount: 3, currency: "EUR", views: 50, clicks: 2 },
    { spentAmount: 8, currency: "USD", views: 50, clicks: 1 },
  ]);
  assert.deepEqual(result.spend, [{ currency: "EUR", amount: 15 }, { currency: "USD", amount: 8 }]);
  assert.equal(result.views, 200);
  assert.equal(result.clicks, 10);
  assert.equal(result.clickRate, 5);
});

test("promotion drafts reject invalid budgets, schedules and caller-supplied active status", () => {
  const valid = { jobListingId: "my-call", budgetAmount: 25, startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-11-08T00:00:00Z" };
  assert.equal(promotionDraftSchema.safeParse(valid).success, true);
  for (const change of [{ budgetAmount: 0 }, { budgetAmount: -10 }, { budgetAmount: 1.001 }, { endsAt: valid.startsAt }, { startsAt: "invalid" }, { status: "active" }]) {
    assert.equal(promotionDraftSchema.safeParse({ ...valid, ...change }).success, false);
  }
});
