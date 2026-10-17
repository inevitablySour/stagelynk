import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validations";
import { getRequestMetadataFromHeaders } from "@/lib/request-context";
import { writeAuditLog } from "@/lib/audit-log";
import { sendWelcomeEmail } from "@/lib/email-templates";
import { CURRENT_TERMS_VERSION } from "@/config";

const log = getLogger("api-auth-register");

export async function POST(request: NextRequest) {
  const requestMetadata = getRequestMetadataFromHeaders(request.headers);

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      await writeAuditLog({
        event: "authn_register_fail",
        category: "auth",
        level: "warn",
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        requestId: requestMetadata.requestId,
        metadata: { reason: "validation_failed" },
      });

      return NextResponse.json(
        { success: false, message: "Check your details and try again." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const name = parsed.data.name.trim();
    const role = parsed.data.role;
    const venueName = parsed.data.venueName?.trim() || `${name}'s Venue`;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      await writeAuditLog({
        event: "authn_register_fail",
        category: "auth",
        level: "warn",
        actorEmail: email,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        requestId: requestMetadata.requestId,
        metadata: { reason: "email_unavailable" },
      });

      return NextResponse.json(
        { success: false, message: "An account with this email already exists. Try signing in instead." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        termsAcceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
        musicianProfile:
          role === "musician"
            ? {
                create: {
                  stageName: name,
                },
              }
            : undefined,
        venueProfile:
          role === "venue"
            ? {
                create: {
                  venueName,
                },
              }
            : undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    await writeAuditLog({
      event: "authn_register_success",
      category: "auth",
      level: "info",
      actorUserId: user.id,
      actorEmail: user.email,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      requestId: requestMetadata.requestId,
      targetType: "User",
      targetId: user.id,
      metadata: { provider: "credentials", role: user.role, termsVersion: CURRENT_TERMS_VERSION },
    });

    await sendWelcomeEmail({ email: user.email, name }, user.role === "venue" ? "venue" : "musician").catch((err) =>
      log.error({ err }, "Failed to send welcome email")
    );

    return NextResponse.json(
      {
        success: true,
        redirectTo: user.role === "venue" ? "/venue" : "/musician",
      },
      { status: 201 }
    );
  } catch (error) {
    log.error({ err: error }, "Registration failed");

    const isUniqueConstraint =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

    await writeAuditLog({
      event: "authn_register_error",
      category: "auth",
      level: isUniqueConstraint ? "warn" : "error",
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      requestId: requestMetadata.requestId,
      metadata: { reason: isUniqueConstraint ? "unique_constraint" : "unexpected_error" },
    });

    return NextResponse.json(
      { success: false, message: "Unable to create an account right now." },
      { status: isUniqueConstraint ? 400 : 500 }
    );
  }
}
