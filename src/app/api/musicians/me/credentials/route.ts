import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";

const credentialsSchema = z.object({
  credentials: z.array(
    z.object({
      type: z.enum(["degree", "certificate", "license", "award"]),
      title: z.string().trim().min(1).max(150),
      issuer: z.string().trim().max(150).optional(),
      year: z.number().int().min(1950).max(2100).optional(),
    })
  ),
});

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const parsed = credentialsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid credentials", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.credential.deleteMany({ where: { musicianId: musician.id } }),
    ...parsed.data.credentials.map((c) =>
      prisma.credential.create({
        data: {
          musicianId: musician.id,
          type: c.type,
          title: c.title,
          issuer: c.issuer ?? "",
          year: c.year,
        },
      })
    ),
  ]);

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "profile_credentials_update",
    category: "profile",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "MusicianProfile",
    targetId: musician.id,
  });

  const updated = await prisma.credential.findMany({ where: { musicianId: musician.id } });
  return NextResponse.json({ success: true, data: updated });
}
