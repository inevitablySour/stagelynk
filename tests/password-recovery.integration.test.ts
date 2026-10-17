import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { createPasswordReset, consumePasswordReset, hashResetToken } from "../src/lib/password-recovery";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
if (enabled) {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.pathname.endsWith("_test"));
}
const ids: string[] = [];
const emails: string[] = [];
const ips: string[] = [];
async function fixture(options: { oauthOnly?: boolean; deleted?: boolean } = {}) {
  const email = `${randomUUID()}@recovery-test.invalid`;
  const password = randomBytes(24).toString("base64url");
  const user = await prisma.user.create({
    data: { email, passwordHash: options.oauthOnly ? null : await hashPassword(password), deletedAt: options.deleted ? new Date() : null },
  });
  const ip = `fixture-${randomUUID()}`;
  ids.push(user.id); emails.push(email); ips.push(ip);
  return { user, password, ip };
}

test("isolated recovery: eligible accounts get only a hashed, expiring reset token", { skip: !enabled }, async () => {
  const { user, ip } = await fixture();
  const reset = await createPasswordReset(user.email, ip);
  assert.ok(reset);
  const stored = await prisma.verificationToken.findFirstOrThrow({ where: { identifier: `password-reset:${user.id}` } });
  assert.equal(reset.token.length, 43);
  assert.notEqual(stored.token, reset.token);
  assert.equal(stored.token, hashResetToken(reset.token));
  assert.ok(stored.expires > new Date());
  assert.ok(stored.expires.getTime() <= Date.now() + 30 * 60000);
  assert.equal(await createPasswordReset(user.email, ip), null);
});

test("isolated recovery: missing, deleted and OAuth-only accounts do not get reset tokens", { skip: !enabled }, async () => {
  for (const options of [{ oauthOnly: true }, { deleted: true }]) {
    const { user, ip } = await fixture(options);
    assert.equal(await createPasswordReset(user.email, ip), null);
    assert.equal(await prisma.verificationToken.count({ where: { identifier: `password-reset:${user.id}` } }), 0);
  }
  const email = `${randomUUID()}@recovery-test.invalid`;
  const ip = `fixture-${randomUUID()}`;
  emails.push(email); ips.push(ip);
  assert.equal(await createPasswordReset(email, ip), null);
});

test("isolated recovery: expired tokens do not change the password or session version", { skip: !enabled }, async () => {
  const { user, password, ip } = await fixture();
  const reset = await createPasswordReset(user.email, ip);
  assert.ok(reset);
  await prisma.verificationToken.updateMany({ where: { identifier: `password-reset:${user.id}` }, data: { expires: new Date(0) } });
  assert.equal(await consumePasswordReset(reset.token, randomBytes(24).toString("base64url")), null);
  const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(unchanged.sessionVersion, 0);
  assert.ok(await verifyPassword(unchanged.passwordHash!, password));
});

test("isolated recovery: successful reset revokes sessions and token replay fails", { skip: !enabled }, async () => {
  const { user, ip } = await fixture();
  const reset = await createPasswordReset(user.email, ip);
  assert.ok(reset);
  await prisma.session.create({ data: { userId: user.id, sessionToken: randomBytes(32).toString("base64url"), expires: new Date(Date.now() + 86400000) } });
  await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 4, lockedUntil: new Date(Date.now() + 600000) } });
  const nextPassword = randomBytes(24).toString("base64url");
  assert.ok(await consumePasswordReset(reset.token, nextPassword));
  const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.ok(await verifyPassword(updated.passwordHash!, nextPassword));
  assert.equal(updated.sessionVersion, 1);
  assert.equal(updated.failedLoginCount, 0);
  assert.equal(updated.lockedUntil, null);
  assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);
  assert.equal(await consumePasswordReset(reset.token, nextPassword), null);
});

test("isolated recovery: concurrent consumption changes the password only once", { skip: !enabled }, async () => {
  const { user, ip } = await fixture();
  const reset = await createPasswordReset(user.email, ip);
  assert.ok(reset);
  const password = randomBytes(24).toString("base64url");
  const results = await Promise.all([consumePasswordReset(reset.token, password), consumePasswordReset(reset.token, password)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).sessionVersion, 1);
});

after(async () => {
  if (enabled) {
    const identifiers = [
      ...ids.map((id) => `password-reset:${id}`),
      ...emails.map((email) => `password-reset-rate:email:${hashResetToken(email)}`),
      ...ips.map((ip) => `password-reset-rate:ip:${hashResetToken(ip)}`),
    ];
    await prisma.verificationToken.deleteMany({ where: { identifier: { in: identifiers } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.$disconnect();
});
