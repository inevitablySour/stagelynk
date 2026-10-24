import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeMusicianProfile } from "@/lib/serializers";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const profile = await prisma.musicianProfile.findUnique({
    where: { id, user: { deletedAt: null } },
    include: {
      genres: { include: { genre: true } },
      services: { include: { service: true } },
      albums: { include: { tracks: true } },
      credentials: true,
      availabilitySlots: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ success: false, message: "Musician not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: serializeMusicianProfile(profile) });
}
