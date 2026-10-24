import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { projectListingSchema } from "@/lib/validations";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!venue) {
    return NextResponse.json({ success: false, message: "Venue profile not found" }, { status: 404 });
  }

  const { id } = await params;
  const existing = await prisma.projectListing.findUnique({ where: { id }, include: { _count: { select: { applications: true } } } });
  if (!existing || existing.venueId !== venue.id) {
    return NextResponse.json({ success: false, message: "Project listing not found" }, { status: 404 });
  }

  const parsed = projectListingSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid update", errors: parsed.error.flatten() }, { status: 400 });
  }

  if (existing._count.applications && Object.keys(parsed.data).some((key) => key !== "status")) {
    return NextResponse.json(
      { success: false, message: "Projects with applications cannot change their brief or budget. Close this one and create a new one." },
      { status: 400 }
    );
  }

  const { deadline, ...rest } = parsed.data;
  const updated = await prisma.projectListing.update({
    where: { id },
    data: {
      ...rest,
      ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
