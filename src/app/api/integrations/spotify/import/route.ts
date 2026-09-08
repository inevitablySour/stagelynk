import { NextResponse } from "next/server";
import { z } from "zod/v4";

const spotifyImportSchema = z.object({
  musicianId: z.string(),
  spotifyArtistId: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = spotifyImportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid Spotify import request", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // TODO: Use Spotify Web API to fetch albums/tracks and normalize into Album/Track rows.
  // Required env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET.
  return NextResponse.json({
    success: true,
    message: "Spotify import scaffold ready",
    data: parsed.data,
  });
}
