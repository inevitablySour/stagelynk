import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getLogger } from "@/lib/logger";

const log = getLogger("stripe-setup-intent");

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    let customerId: string | null = null;

    if (session.user.role === "venue") {
      const venue = await prisma.venueProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true, stripeCustomerId: true, venueName: true },
      });
      if (!venue) {
        return NextResponse.json({ success: false, message: "Venue profile not found" }, { status: 404 });
      }
      customerId = venue.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({ email: session.user.email ?? undefined, name: venue.venueName });
        customerId = customer.id;
        await prisma.venueProfile.update({ where: { id: venue.id }, data: { stripeCustomerId: customerId } });
      }
    } else if (session.user.role === "musician") {
      // A musician gets a Stripe Customer (payer identity) the first time
      // they add a payment method — e.g. to pay another artist in a P2P
      // deal — mirroring the venue flow above. This is separate from their
      // stripeConnectAccountId, which is their payee identity for being
      // booked. Populated lazily, never at profile creation.
      const musician = await prisma.musicianProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true, stripeCustomerId: true, stageName: true },
      });
      if (!musician) {
        return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
      }
      customerId = musician.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({ email: session.user.email ?? undefined, name: musician.stageName });
        customerId = customer.id;
        await prisma.musicianProfile.update({ where: { id: musician.id }, data: { stripeCustomerId: customerId } });
      }
    } else {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
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
