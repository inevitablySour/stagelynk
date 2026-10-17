import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchArtistDiscography } from "@/lib/spotify";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";
import { getLogger } from "@/lib/logger";

const log = getLogger("spotify-import");

const spotifyImportSchema = z.object({
  spotifyArtistId: z.string().min(1),
});

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
  const parsed = spotifyImportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid Spotify import request", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let albums;
  try {
    albums = await fetchArtistDiscography(parsed.data.spotifyArtistId);
  } catch (error) {
    log.error({ err: error, spotifyArtistId: parsed.data.spotifyArtistId }, "Spotify import failed");
    const message = error instanceof Error ? error.message : "Unable to import from Spotify";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }

  if (albums.length === 0) {
    return NextResponse.json({ success: false, message: "No albums found for this Spotify artist" }, { status: 404 });
  }

  const created = [];
  for (const album of albums) {
    const existing = await prisma.album.findFirst({
      where: { musicianId: musician.id, source: "spotify", externalId: album.externalId },
    });
    if (existing) continue;

    const createdAlbum = await prisma.album.create({
      data: {
        musicianId: musician.id,
        title: album.title,
        releaseYear: album.releaseYear,
        coverArt: album.coverArt,
        source: "spotify",
        externalId: album.externalId,
        externalUrl: album.externalUrl,
        tracks: {
          create: album.tracks.map((track) => ({
            title: track.title,
            duration: track.duration,
            trackNumber: track.trackNumber,
            previewUrl: track.previewUrl,
          })),
        },
      },
      include: { tracks: true },
    });
    created.push(createdAlbum);
  }

  await prisma.musicianProfile.update({
    where: { id: musician.id },
    data: { spotifyConnected: true },
  });

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "integration_spotify_import",
    category: "integration",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "MusicianProfile",
    targetId: musician.id,
    metadata: { spotifyArtistId: parsed.data.spotifyArtistId, albumsImported: created.length },
  });

  return NextResponse.json({
    success: true,
    message: `Imported ${created.length} album${created.length === 1 ? "" : "s"} from Spotify`,
    data: created,
  });
}
