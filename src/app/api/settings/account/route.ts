import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod/v4";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";
import { getRequestMetadataFromHeaders } from "@/lib/request-context";
import { writeAuditLog } from "@/lib/audit-log";
import { sendAccountDeletionEmail } from "@/lib/email-templates";

const log = getLogger("api-settings-account");

const accountInfoSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120).optional(),
  location: z.string().trim().max(120).optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Not signed in." }, { status: 401 });
  }

  const parsed = accountInfoSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid account details", errors: parsed.error.flatten() }, { status: 400 });
  }

  const { name, location } = parsed.data;
  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    if (name !== undefined) {
      await tx.user.update({ where: { id: userId }, data: { name } });
    }
    if (location !== undefined) {
      if (session.user.role === "musician") {
        await tx.musicianProfile.updateMany({ where: { userId }, data: { location } });
      } else if (session.user.role === "venue") {
        await tx.venueProfile.updateMany({ where: { userId }, data: { location } });
      }
    }
  });

  const requestMetadata = getRequestMetadataFromHeaders(request.headers);
  await writeAuditLog({
    event: "account_info_updated",
    category: "profile",
    level: "info",
    actorUserId: userId,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "User",
    targetId: userId,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Not signed in." }, { status: 401 });
  }

  const requestMetadata = getRequestMetadataFromHeaders(request.headers);
  const userId = session.user.id;

  try {
    const userBeforeDeletion = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    const anonymizedEmail = `deleted-${userId}-${randomUUID().slice(0, 8)}@deleted.stagelynk.invalid`;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: anonymizedEmail,
          name: "Deleted User",
          image: null,
          passwordHash: null,
          emailVerified: null,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });

      await tx.account.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });

      const musicianProfile = await tx.musicianProfile.findUnique({ where: { userId }, select: { id: true } });
      if (musicianProfile) {
        await tx.credential.deleteMany({ where: { musicianId: musicianProfile.id } });
        await tx.availabilitySlot.deleteMany({ where: { musicianId: musicianProfile.id } });
      }

      await tx.musicianProfile.updateMany({
        where: { userId },
        data: {
          stageName: "Deleted User",
          bio: "",
          location: "",
          profileImage: null,
          bannerImage: null,
          socialLinks: {},
          instruments: [],
          spotifyConnected: false,
          spotifyAccessToken: null,
          spotifyRefreshToken: null,
          appleMusicConnected: false,
          appleMusicToken: null,
        },
      });

      await tx.venueProfile.updateMany({
        where: { userId },
        data: {
          venueName: "Deleted Account",
          description: "",
          location: "",
          profileImage: null,
          bannerImage: null,
        },
      });
    });

    await writeAuditLog({
      event: "account_deleted",
      category: "profile",
      level: "warn",
      actorUserId: userId,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      requestId: requestMetadata.requestId,
      targetType: "User",
      targetId: userId,
      metadata: {},
    });

    if (userBeforeDeletion?.email) {
      sendAccountDeletionEmail({ email: userBeforeDeletion.email, name: userBeforeDeletion.name ?? undefined }).catch(
        (err) => log.error({ err }, "Failed to send account deletion email")
      );
    }

    await signOut({ redirect: false });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Account deletion failed");
    return NextResponse.json(
      { success: false, message: "Unable to delete your account right now." },
      { status: 500 }
    );
  }
}
