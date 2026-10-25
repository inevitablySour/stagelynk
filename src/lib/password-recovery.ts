import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const RESET_PREFIX = "password-reset:";
// Lets a GitHub/Google-only account add a password. Kept distinct from reset
// tokens: each kind is only redeemable for accounts in the matching state.
const SETUP_PREFIX = "password-setup:";
const RATE_PREFIX = "password-reset-rate:";
export const passwordResetRequestSchema = z.object({ email: z.string().trim().max(254).pipe(z.email()).transform((value) => value.toLowerCase()) });
export const passwordResetSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});
export const RESET_REQUEST_MESSAGE = "If that email belongs to an eligible account, we'll send a password reset link. Check your inbox and spam folder.";
export const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const resetTokenExpiry = (now = new Date()) => new Date(now.getTime() + 30 * 60000);

async function allowResetRequest(email: string, ip: string, now: Date) {
  const emailKey = `${RATE_PREFIX}email:${hashResetToken(email)}`;
  const ipKey = `${RATE_PREFIX}ip:${hashResetToken(ip)}`;
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.verificationToken.deleteMany({ where: { identifier: { startsWith: RATE_PREFIX }, expires: { lte: now } } });
      if (await tx.verificationToken.count({ where: { identifier: emailKey } }) >= 1) return false;
      if (await tx.verificationToken.count({ where: { identifier: ipKey } }) >= 10) return false;
      await tx.verificationToken.createMany({ data: [
        { identifier: emailKey, token: randomUUID(), expires: new Date(now.getTime() + 60000) },
        { identifier: ipKey, token: randomUUID(), expires: new Date(now.getTime() + 15 * 60000) },
      ] });
      return true;
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if ((error as { code?: string }).code === "P2034") return false;
    throw error;
  }
}

export async function createPasswordReset(email: string, ip = "unknown", now = new Date()) {
  if (!await allowResetRequest(email, ip, now)) return null;
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null, passwordHash: { not: null } },
    select: { id: true, email: true, name: true },
  });
  if (!user) return null;
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  await prisma.$transaction(async (tx) => {
    await tx.verificationToken.deleteMany({ where: { identifier: `${RESET_PREFIX}${user.id}` } });
    await tx.verificationToken.create({ data: { identifier: `${RESET_PREFIX}${user.id}`, token: tokenHash, expires: resetTokenExpiry(now) } });
  }, { isolationLevel: "Serializable" });
  return { user, token, tokenHash };
}

/** Emails a link that lets a signed-in, password-less (OAuth-only) account add a password. */
export async function createPasswordSetup(userId: string, ip = "unknown", now = new Date()) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, passwordHash: null },
    select: { id: true, email: true, name: true },
  });
  if (!user) return { status: "not_eligible" as const };
  if (!await allowResetRequest(user.email, ip, now)) return { status: "rate_limited" as const };
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction(async (tx) => {
    await tx.verificationToken.deleteMany({ where: { identifier: `${SETUP_PREFIX}${user.id}` } });
    await tx.verificationToken.create({ data: { identifier: `${SETUP_PREFIX}${user.id}`, token: hashResetToken(token), expires: resetTokenExpiry(now) } });
  }, { isolationLevel: "Serializable" });
  return { status: "sent" as const, user, token };
}

/** Redeems a reset or setup token. Returns the user and which kind was used, or null. */
export async function consumePasswordReset(token: string, password: string, now = new Date()) {
  const tokenHash = hashResetToken(token);
  const reset = await prisma.verificationToken.findFirst({
    where: { token: tokenHash, OR: [{ identifier: { startsWith: RESET_PREFIX } }, { identifier: { startsWith: SETUP_PREFIX } }], expires: { gt: now } },
  });
  if (!reset) return null;
  const isSetup = reset.identifier.startsWith(SETUP_PREFIX);
  // A reset needs an existing password; a setup needs there to be none yet.
  const passwordState = isSetup ? null : { not: null };
  const passwordHash = await hashPassword(password);
  return prisma.$transaction(async (tx) => {
    const consumed = await tx.verificationToken.deleteMany({ where: { identifier: reset.identifier, token: tokenHash, expires: { gt: new Date() } } });
    if (consumed.count !== 1) return null;
    const userId = reset.identifier.slice((isSetup ? SETUP_PREFIX : RESET_PREFIX).length);
    const user = await tx.user.findFirst({
      where: { id: userId, deletedAt: null, passwordHash: passwordState },
      select: { id: true, email: true, name: true },
    });
    if (!user) return null;
    const updated = await tx.user.updateMany({
      where: { id: user.id, deletedAt: null, passwordHash: passwordState },
      data: { passwordHash, sessionVersion: { increment: 1 }, failedLoginCount: 0, lockedUntil: null },
    });
    if (updated.count !== 1) return null;
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.verificationToken.deleteMany({ where: { identifier: { in: [`${RESET_PREFIX}${user.id}`, `${SETUP_PREFIX}${user.id}`] } } });
    return { ...user, kind: isSetup ? ("setup" as const) : ("reset" as const) };
  });
}
