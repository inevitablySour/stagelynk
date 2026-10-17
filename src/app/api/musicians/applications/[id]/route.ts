import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const withdrawSchema = z.object({ action: z.literal("withdraw") });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }

  const musician = await prisma.musicianProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!musician) {
    return NextResponse.json({ success: false, message: "Musician profile not found" }, { status: 404 });
  }

  const application = await prisma.jobApplication.findUnique({ where: { id } });
  if (!application || application.musicianId !== musician.id) {
    return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
  }

  if (application.status !== "submitted" && application.status !== "shortlisted") {
    return NextResponse.json({ success: false, message: "This application can no longer be withdrawn" }, { status: 400 });
  }

  const updated = await prisma.jobApplication.updateMany({
    where: {
      id, musicianId: musician.id, status: { in: ["submitted", "shortlisted"] },
      OR: [{ booking: null }, { booking: { status: "cancelled", paymentStatus: { in: ["cancelled", "failed"] } } }],
    },
    data: { status: "withdrawn" },
  });
  if (!updated.count) return NextResponse.json({ success: false, message: "This application is being booked and cannot be withdrawn. Refresh to see its status." }, { status: 409 });
  return NextResponse.json({ success: true });
}
