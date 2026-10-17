import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { albumSchema, trackUploadSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";

const manualDiscographySchema = z.object({
  album: albumSchema,
  tracks: z
    .array(
      trackUploadSchema.extend({
        duration: z.number().min(0).optional(),
        previewUrl: z.string().optional(),
      })
    )
    .min(1),
  coverArtUrl: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Musician profile not found" }, { status: 404 });
  }

  const albums = await prisma.album.findMany({
    where: { musicianId: musician.id },
    include: { tracks: { orderBy: { trackNumber: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: albums });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Musician profile not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = manualDiscographySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid discography payload", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const album = await prisma.album.create({
    data: {
      musicianId: musician.id,
      title: parsed.data.album.title,
      releaseYear: parsed.data.album.releaseYear,
      coverArt: parsed.data.coverArtUrl,
      source: "manual",
      tracks: {
        create: parsed.data.tracks.map((track, index) => ({
          title: track.title,
          genre: track.genre,
          trackNumber: track.trackNumber ?? index + 1,
          duration: track.duration ?? 0,
          previewUrl: track.previewUrl,
        })),
      },
    },
    include: { tracks: true },
  });

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "discography_album_create",
    category: "profile",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "Album",
    targetId: album.id,
  });

  return NextResponse.json({ success: true, data: album }, { status: 201 });
}
