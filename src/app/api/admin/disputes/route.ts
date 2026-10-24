import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const OPEN_STATUSES = ["pending_response", "accepted", "declined", "auto_resolved", "escalated"] as const;

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
  }

  const disputes = await prisma.bookingDispute.findMany({
    where: { status: { in: [...OPEN_STATUSES] } },
    orderBy: { createdAt: "asc" },
    include: {
      booking: {
        select: {
          id: true,
          title: true,
          eventDate: true,
          totalChargeAmount: true,
          currency: true,
          musician: { select: { stageName: true } },
          venue: { select: { venueName: true } },
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: disputes });
}
