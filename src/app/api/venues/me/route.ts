import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { venueProfileSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.venueProfile.findUnique({
    where: { userId: session.user.id },
    include: { membershipTier: true },
  });

  if (!profile) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: profile });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = venueProfileSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid venue profile update", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!existing) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const profile = await prisma.venueProfile.update({
    where: { userId: session.user.id },
    data: parsed.data,
  });

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "profile_update",
    category: "profile",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "VenueProfile",
    targetId: profile.id,
  });

  return NextResponse.json({ success: true, data: profile });
}
