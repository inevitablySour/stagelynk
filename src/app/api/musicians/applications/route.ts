import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Musician profile not found" }, { status: 404 });
  }

  const applications = await prisma.jobApplication.findMany({
    where: { musicianId: musician.id },
    include: { jobListing: { include: { venue: { select: { venueName: true } } } }, booking: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: applications });
}
