import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingRequestCard, bookingCardState } from "../src/components/artists/booking-request-card";
import { PortfolioRelease } from "../src/components/artists/portfolio-release";
import { createEmailMessage, isDeliverableRecipient, MAIL_FROM } from "../src/lib/mail";
import { hashResetToken, resetTokenExpiry, passwordResetRequestSchema, passwordResetSchema } from "../src/lib/password-recovery";
import { APP_NAME } from "../src/config";
import type { Album } from "../src/types";

test("booking card distinguishes guests, creatives, clients, admins and owners", () => {
  assert.equal(bookingCardState(null), "guest");
  assert.equal(bookingCardState({ role: "musician", isOwner: false }), "creative");
  assert.equal(bookingCardState({ role: "venue", isOwner: false }), "client");
  assert.equal(bookingCardState({ role: "admin", isOwner: false }), "admin");
  assert.equal(bookingCardState({ role: "musician", isOwner: true }), "owner");
});

test("signed-in accounts never receive sign-in or registration prompts", () => {
  for (const role of ["musician", "venue", "admin"] as const) {
    const html = renderToStaticMarkup(createElement(BookingRequestCard, { musicianId: "artist", stageName: "Example", viewer: { role, isOwner: false } }));
    assert.equal(html.includes('href="/login"'), false);
    assert.equal(html.includes('href="/register"'), false);
  }
  const client = renderToStaticMarkup(createElement(BookingRequestCard, { musicianId: "artist", stageName: "Example", viewer: { role: "venue", isOwner: false } }));
  assert.ok(client.includes('href="/book/artist"'));
  const own = renderToStaticMarkup(createElement(BookingRequestCard, { musicianId: "artist", stageName: "Example", viewer: { role: "musician", isOwner: true } }));
  assert.ok(own.includes("Manage your profile"));
  assert.equal(own.includes('href="/book/artist"'), false);
});

test("Spotify release has a single player and no duplicate cover/title panel", () => {
  const album: Album = { id: "release", title: "Pitbull — PITCOIN (demo reference only)", releaseYear: 2026, source: "spotify", externalUrl: "https://open.spotify.com/album/4Lkkfpt8ZkDmw4viHHi0IM", coverArt: "https://example.com/cover.jpg", tracks: [] };
  const html = renderToStaticMarkup(createElement(PortfolioRelease, { album }));
  assert.equal((html.match(/<iframe/g) ?? []).length, 1);
  assert.equal(html.includes("<img"), false);
  assert.equal(html.includes("<h3"), false);
  assert.equal(html.includes("<audio"), false);
  assert.ok(html.includes("Demo reference"));
});

test("transactional senders and support replies use the configured purpose-specific addresses", () => {
  const message = createEmailMessage({
    from: { email: MAIL_FROM.accounts, name: APP_NAME },
    to: [{ email: "recipient@real-mail-domain.com" }], subject: "Account update", text: "Your account update.",
  });
  assert.equal(message?.From.Email, MAIL_FROM.accounts);
  assert.equal(message?.From.Name, `${APP_NAME} Accounts`);
  assert.equal(message?.ReplyTo?.Email, MAIL_FROM.support);
  for (const email of ["demo@example.test", "demo@demo.stagelynk.invalid", "demo@example.com", "demo@localhost"]) assert.equal(isDeliverableRecipient(email), false);
});

test("recovery tokens are hashed and expire after thirty minutes", () => {
  const token = "a".repeat(43);
  assert.notEqual(hashResetToken(token), token);
  assert.equal(hashResetToken(token).length, 64);
  assert.equal(resetTokenExpiry(new Date(0)).getTime(), 30 * 60000);
  assert.equal(passwordResetSchema.safeParse({ token, password: "a-strong-test-password" }).success, true);
  assert.equal(passwordResetSchema.safeParse({ token: "invalid", password: "short" }).success, false);
  assert.equal(passwordResetRequestSchema.parse({ email: "Person@real-mail-domain.com" }).email, "person@real-mail-domain.com");
});
