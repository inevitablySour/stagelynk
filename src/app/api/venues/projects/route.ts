import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { projectListingSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!venue) {
    return NextResponse.json({ success: false, message: "Venue profile not found" }, { status: 404 });
  }

  const listings = await prisma.projectListing.findMany({
    where: { venueId: venue.id },
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: listings });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findFirst({ where: { userId: session.user.id, user: { deletedAt: null } } });
  if (!venue) {
    return NextResponse.json({ success: false, message: "Venue profile not found" }, { status: 404 });
  }

  const parsed = projectListingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid project listing", errors: parsed.error.flatten() }, { status: 400 });
  }

  const { deadline, genres, requiredServices, categories, status, ...rest } = parsed.data;
  const budgetMin = rest.budgetMin ?? 0;
  const budgetMax = rest.budgetMax ?? 0;
  if (budgetMax < budgetMin) {
    return NextResponse.json({ success: false, message: "Maximum budget cannot be below minimum budget." }, { status: 400 });
  }

  const listing = await prisma.projectListing.create({
    data: {
      ...rest,
      venueId: venue.id,
      budgetMin,
      budgetMax,
      deadline: deadline ? new Date(deadline) : null,
      genres: genres ?? [],
      categories: categories ?? [],
      requiredServices: requiredServices ?? [],
      status: status ?? "draft",
    },
  });

  const requestMetadata = await getRequestMetadata();
  await writeAuditLog({
    event: "project_listing_create",
    category: "job",
    level: "info",
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "ProjectListing",
    targetId: listing.id,
  });

  return NextResponse.json({ success: true, data: listing }, { status: 201 });
}
