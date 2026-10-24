import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { musicianProfileSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId: session.user.id },
    include: { genres: { include: { genre: true } }, services: { include: { service: true } } },
  });

  if (!profile) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...profile,
      genres: profile.genres.map((mg) => mg.genre),
      services: profile.services.map((ms) => ms.service),
    },
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = musicianProfileSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid musician profile update", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { genres: genreSlugs, services: serviceSlugs, ...profileFields } = parsed.data;

  const existing = await prisma.musicianProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!existing) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const profile = await prisma.musicianProfile.update({
    where: { userId: session.user.id },
    data: {
      ...profileFields,
      ...(genreSlugs
        ? {
            genres: {
              deleteMany: {},
              create: await Promise.all(
                genreSlugs.map(async (slug) => {
                  const genre = await prisma.genre.upsert({
                    where: { slug },
                    update: {},
                    create: { slug, name: slug },
                  });
                  return { genreId: genre.id };
                })
              ),
            },
          }
        : {}),
      ...(serviceSlugs
        ? {
            services: {
              deleteMany: {},
              create: await Promise.all(
                serviceSlugs.map(async (slug) => {
                  const service = await prisma.service.upsert({
                    where: { slug },
                    update: {},
                    create: { slug, name: slug },
                  });
                  return { serviceId: service.id };
                })
              ),
            },
          }
        : {}),
    },
    include: { genres: { include: { genre: true } }, services: { include: { service: true } } },
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
    targetType: "MusicianProfile",
    targetId: profile.id,
  });

  return NextResponse.json({
    success: true,
    data: {
      ...profile,
      genres: profile.genres.map((mg) => mg.genre),
      services: profile.services.map((ms) => ms.service),
    },
  });
}
