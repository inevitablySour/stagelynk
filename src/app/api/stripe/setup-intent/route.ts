import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getLogger } from "@/lib/logger";

const log = getLogger("stripe-setup-intent");

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, stripeCustomerId: true, venueName: true },
  });

  if (!venue) {
    return NextResponse.json({ success: false, message: "Venue profile not found" }, { status: 404 });
  }

  try {
    let customerId = venue.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        name: venue.venueName,
      });
      customerId = customer.id;

      await prisma.venueProfile.update({
        where: { id: venue.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
    });

    return NextResponse.json({
      success: true,
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    log.error({ err: error }, "Failed to create SetupIntent");
    return NextResponse.json({ success: false, message: "Unable to start payment setup" }, { status: 500 });
  }
}
