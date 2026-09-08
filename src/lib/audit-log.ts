import { createHmac } from "crypto";
import type { AuditEventCategory, AuditLogLevel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";

const log = getLogger("audit-log");

const RETENTION_DAYS_BY_CATEGORY: Record<AuditEventCategory, number> = {
  auth: Number(process.env.AUDIT_AUTH_RETENTION_DAYS ?? 180),
  authorization: Number(process.env.AUDIT_AUTHZ_RETENTION_DAYS ?? 180),
  profile: Number(process.env.AUDIT_BUSINESS_RETENTION_DAYS ?? 365),
  booking: Number(process.env.AUDIT_BUSINESS_RETENTION_DAYS ?? 365),
  billing: Number(process.env.AUDIT_CRITICAL_RETENTION_DAYS ?? 730),
  payment: Number(process.env.AUDIT_CRITICAL_RETENTION_DAYS ?? 730),
  job: Number(process.env.AUDIT_BUSINESS_RETENTION_DAYS ?? 365),
  promotion: Number(process.env.AUDIT_BUSINESS_RETENTION_DAYS ?? 365),
  analytics: Number(process.env.AUDIT_SYSTEM_RETENTION_DAYS ?? 365),
  integration: Number(process.env.AUDIT_BUSINESS_RETENTION_DAYS ?? 365),
  system: Number(process.env.AUDIT_SYSTEM_RETENTION_DAYS ?? 365),
  admin: Number(process.env.AUDIT_CRITICAL_RETENTION_DAYS ?? 730),
};

const REDACTED_KEY_PARTS = [
  "password",
  "secret",
  "token",
  "cookie",
  "authorization",
  "credential",
  "card",
  "payment",
];

export interface WriteAuditLogInput {
  event: string;
  category: AuditEventCategory;
  level?: AuditLogLevel;
  actorUserId?: string;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  retentionDays?: number;
}

function auditHash(value?: string) {
  if (!value) return undefined;

  const salt =
    process.env.LOG_SALT ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "stagelynk-development-log-salt";

  return createHmac("sha256", salt).update(value.toLowerCase().trim()).digest("hex");
}

function shouldRedact(key: string) {
  const normalized = key.toLowerCase();
  return REDACTED_KEY_PARTS.some((part) => normalized.includes(part));
}

function serializeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined;

  try {
    return JSON.parse(
      JSON.stringify(metadata, (key, value) => {
        if (shouldRedact(key)) return "[REDACTED]";
        if (value instanceof Error) {
          return { name: value.name, message: value.message };
        }
        if (typeof value === "bigint") return value.toString();
        return value;
      })
    ) as Prisma.InputJsonValue;
  } catch {
    return { serialization: "failed" } satisfies Prisma.InputJsonObject;
  }
}

export function getAuditExpiresAt(category: AuditEventCategory, level?: AuditLogLevel, retentionDays?: number) {
  const days =
    retentionDays ??
    (level === "critical" ? Number(process.env.AUDIT_CRITICAL_RETENTION_DAYS ?? 730) : RETENTION_DAYS_BY_CATEGORY[category]);

  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function writeAuditLog(input: WriteAuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        event: input.event,
        category: input.category,
        level: input.level ?? "info",
        actorUserId: input.actorUserId,
        actorEmailHash: auditHash(input.actorEmail),
        ipAddressHash: auditHash(input.ipAddress),
        userAgent: input.userAgent,
        requestId: input.requestId,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: serializeMetadata(input.metadata),
        expiresAt: getAuditExpiresAt(input.category, input.level, input.retentionDays),
      },
    });
  } catch (error) {
    log.error({ err: error, event: input.event }, "Failed to persist audit log");
  }
}

export async function pruneExpiredAuditLogs(now = new Date()) {
  return prisma.auditLog.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });
}
