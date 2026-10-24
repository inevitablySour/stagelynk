import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const notificationPreferenceSchema = z.object({
  bookingRequests: z.boolean(),
  bookingUpdates: z.boolean(),
  newReviews: z.boolean(),
  jobAlerts: z.boolean(),
  marketingEmails: z.boolean(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Not signed in." }, { status: 401 });
  }

  const preference = await prisma.notificationPreference.findUnique({ where: { userId: session.user.id } });

  return NextResponse.json({
    success: true,
    data: preference ?? {
      bookingRequests: true,
      bookingUpdates: true,
      newReviews: true,
      jobAlerts: true,
      marketingEmails: true,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Not signed in." }, { status: 401 });
  }

  const parsed = notificationPreferenceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid preferences", errors: parsed.error.flatten() }, { status: 400 });
  }

  const preference = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ success: true, data: preference });
}
