import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { projectApplicationSchema } from "@/lib/validations";
import { getLogger } from "@/lib/logger";

const log = getLogger("api-musicians-projects-apply");

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const musician = await prisma.musicianProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const { id } = await params;
  const listing = await prisma.projectListing.findUnique({ where: { id }, include: { venue: { select: { venueName: true } } } });
  if (!listing || listing.status !== "published") {
    return NextResponse.json({ success: false, message: "This project is not accepting applications." }, { status: 404 });
  }

  const parsed = projectApplicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid application", errors: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.projectApplication.findUnique({
    where: { projectListingId_musicianId: { projectListingId: id, musicianId: musician.id } },
  });
  if (existing) {
    return NextResponse.json({ success: false, message: "You've already applied to this project." }, { status: 400 });
  }

  const application = await prisma.projectApplication.create({
    data: {
      projectListingId: id,
      musicianId: musician.id,
      coverMessage: parsed.data.coverMessage ?? "",
      proposedFee: parsed.data.proposedFee,
    },
  });

  log.info({ applicationId: application.id }, "Project application submitted");

  return NextResponse.json({ success: true, data: application }, { status: 201 });
}
