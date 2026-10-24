import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 10 * 60 * 1000;
export const LINK_STATE_COOKIE = "indiecentral.link_state";

function getSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createLinkState(userId: string, provider: string) {
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = Date.now() + STATE_TTL_MS;
  const payload = `${userId}.${provider}.${nonce}.${expiresAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifyLinkState(
  state: string,
  expected: { userId: string; provider: string }
): { valid: boolean } {
  const parts = state.split(".");
  if (parts.length !== 5) return { valid: false };

  const [userId, provider, nonce, expiresAtStr, signature] = parts;
  const payload = `${userId}.${provider}.${nonce}.${expiresAtStr}`;
  const expectedSignature = sign(payload);

  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return { valid: false };
  }

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return { valid: false };
  if (userId !== expected.userId || provider !== expected.provider) return { valid: false };

  return { valid: true };
}
