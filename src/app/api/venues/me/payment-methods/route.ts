import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!venue?.stripeCustomerId) {
    return NextResponse.json({ success: true, data: { paymentMethods: [], defaultPaymentMethodId: null } });
  }

  const [paymentMethods, customer] = await Promise.all([
    stripe.paymentMethods.list({ customer: venue.stripeCustomerId, type: "card" }),
    stripe.customers.retrieve(venue.stripeCustomerId),
  ]);

  const defaultPaymentMethodId =
    !customer.deleted && typeof customer.invoice_settings?.default_payment_method === "string"
      ? customer.invoice_settings.default_payment_method
      : null;

  return NextResponse.json({
    success: true,
    data: {
      paymentMethods: paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand ?? "card",
        last4: pm.card?.last4 ?? "????",
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      })),
      defaultPaymentMethodId,
    },
  });
}

const setDefaultSchema = z.object({ paymentMethodId: z.string() });

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "venue") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const venue = await prisma.venueProfile.findUnique({ where: { userId: session.user.id } });
  if (!venue?.stripeCustomerId) {
    return NextResponse.json({ success: false, message: "No payment account found." }, { status: 400 });
  }

  const parsed = setDefaultSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(parsed.data.paymentMethodId);
  if (paymentMethod.customer !== venue.stripeCustomerId) {
    return NextResponse.json({ success: false, message: "That payment method is not valid for your account." }, { status: 400 });
  }

  await stripe.customers.update(venue.stripeCustomerId, {
    invoice_settings: { default_payment_method: parsed.data.paymentMethodId },
  });

  return NextResponse.json({ success: true });
}
