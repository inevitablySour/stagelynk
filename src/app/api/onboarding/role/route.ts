import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";
import { getRequestMetadataFromHeaders } from "@/lib/request-context";
import { writeAuditLog } from "@/lib/audit-log";
import { sendProfileReadyEmail } from "@/lib/email-templates";
import { CURRENT_TERMS_VERSION } from "@/config";

const log = getLogger("api-onboarding-role");

const bodySchema = z.object({
  role: z.enum(["musician", "venue"]),
  venueName: z.string().trim().min(1).max(200).optional(),
  acceptedTerms: z.literal(true, { message: "You must accept the Terms of Service to continue." }),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Not signed in." }, { status: 401 });
  }
  // Onboarding sets the role; letting an admin through would silently demote them.
  if (session.user.role === "admin") {
    return NextResponse.json({ success: false, message: "Admin accounts don't have a creative or client profile." }, { status: 403 });
  }

  const requestMetadata = getRequestMetadataFromHeaders(request.headers);

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Check your details and try again." },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    const [existingMusicianProfile, existingVenueProfile] = await Promise.all([
      prisma.musicianProfile.findUnique({ where: { userId }, select: { id: true } }),
      prisma.venueProfile.findUnique({ where: { userId }, select: { id: true } }),
    ]);

    if (existingMusicianProfile || existingVenueProfile) {
      return NextResponse.json(
        { success: false, message: "Your account is already set up." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    if (parsed.data.role === "venue" && !parsed.data.venueName) {
      return NextResponse.json(
        { success: false, message: "Organisation name is required." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        role: parsed.data.role,
        termsAcceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
        ...(parsed.data.role === "musician"
          ? { musicianProfile: { create: { stageName: user?.name ?? "New Musician" } } }
          : { venueProfile: { create: { venueName: parsed.data.venueName! } } }),
      },
    });

    await writeAuditLog({
      event: "profile_onboarding_complete",
      category: "profile",
      level: "info",
      actorUserId: userId,
      actorEmail: session.user.email ?? undefined,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      requestId: requestMetadata.requestId,
      targetType: "User",
      targetId: userId,
      metadata: { role: parsed.data.role, termsVersion: CURRENT_TERMS_VERSION },
    });

    if (session.user.email) {
      await sendProfileReadyEmail({ email: session.user.email, name: user?.name ?? undefined }, parsed.data.role).catch(
        (err) => log.error({ err }, "Failed to send welcome email")
      );
    }

    return NextResponse.json({
      success: true,
      redirectTo: parsed.data.role === "venue" ? "/venue" : "/musician",
    });
  } catch (error) {
    log.error({ err: error }, "Onboarding role selection failed");
    return NextResponse.json(
      { success: false, message: "Unable to complete setup right now." },
      { status: 500 }
    );
  }
}
