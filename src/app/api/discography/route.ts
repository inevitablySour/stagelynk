import { NextResponse } from "next/server";
import { albumSchema, trackUploadSchema } from "@/lib/validations";
import { z } from "zod/v4";

const manualDiscographySchema = z.object({
  musicianId: z.string(),
  album: albumSchema,
  tracks: z.array(trackUploadSchema.extend({
    duration: z.number().min(0).optional(),
    previewUrl: z.string().optional(),
  })).min(1),
  coverArtUrl: z.string().optional(),
});

export async function GET() {
  // TODO: Return albums/tracks for the authenticated musician or artist profile.
  return NextResponse.json({ success: true, data: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = manualDiscographySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid discography payload", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // TODO: Persist album, tracks, cover art, and MP3 file URLs.
  return NextResponse.json({ success: true, data: parsed.data }, { status: 201 });
}
