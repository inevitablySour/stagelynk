import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMusicianCalendarEvents, getVenueCalendarEvents } from "@/lib/calendar";

const querySchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid date range" }, { status: 400 });
  }
  const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
  const to = new Date(`${parsed.data.to}T23:59:59.999Z`);

  if (session.user.role === "musician") {
    const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
    if (!musician) return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: await getMusicianCalendarEvents(musician.id, from, to) });
  }

  if (session.user.role === "venue") {
    const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
    if (!venue) return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: await getVenueCalendarEvents(venue.id, from, to) });
  }

  return NextResponse.json({ success: true, data: [] });
}
