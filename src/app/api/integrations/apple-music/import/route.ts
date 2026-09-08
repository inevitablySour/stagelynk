import { NextResponse } from "next/server";
import { z } from "zod/v4";

const appleMusicImportSchema = z.object({
  musicianId: z.string(),
  appleMusicArtistId: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = appleMusicImportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid Apple Music import request", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // TODO: Use Apple Music API to fetch albums/tracks and normalize into Album/Track rows.
  // Required env: APPLE_MUSIC_KEY_ID, APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_PRIVATE_KEY.
  return NextResponse.json({
    success: true,
    message: "Apple Music import scaffold ready",
    data: parsed.data,
  });
}
