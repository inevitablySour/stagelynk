import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, fromMinorUnits } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit-log";
import { confirmOpenCallPayment, reconcileOpenCallRefund } from "@/lib/open-call-payments";

const log = getLogger("stripe-webhook");

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    log.warn({ err: error }, "Stripe webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        await handleChargebackCreated(dispute);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    log.error({ err: error, eventType: event.type }, "Error handling Stripe webhook event");
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;
  if (paymentIntent.metadata.source === "open_call") {
    await confirmOpenCallPayment(bookingId, paymentIntent);
    return;
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;

  await prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { id: bookingId, stripePaymentIntentId: paymentIntent.id },
      data: { paymentStatus: "paid" },
    });

    await tx.marketplaceTransaction.updateMany({
      where: { bookingId, providerPaymentId: paymentIntent.id },
      data: { status: "paid", paidAt: new Date() },
    });
  });

  await writeAuditLog({
    event: "payment_succeeded",
    category: "payment",
    level: "info",
    targetType: "Booking",
    targetId: bookingId,
    metadata: { paymentIntentId: paymentIntent.id, amount: fromMinorUnits(paymentIntent.amount) },
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;
  if (paymentIntent.metadata.source === "open_call") return;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: "failed" },
    });

    await tx.marketplaceTransaction.updateMany({
      where: { bookingId, providerPaymentId: paymentIntent.id },
      data: { status: "failed" },
    });
  });

  await writeAuditLog({
    event: "payment_failed",
    category: "payment",
    level: "warn",
    targetType: "Booking",
    targetId: bookingId,
    metadata: { paymentIntentId: paymentIntent.id },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!intentId) return;
  const matched = await prisma.booking.findFirst({
    where: { OR: [{ stripePaymentIntentId: intentId }, { transactions: { some: { providerPaymentId: intentId } } }] },
  });
  const bookingId = matched?.id ?? charge.metadata?.bookingId;
  if (!bookingId) return;

  const isFullRefund = charge.amount_refunded >= charge.amount;
  if (matched?.source === "job_application") {
    await reconcileOpenCallRefund(bookingId, intentId, isFullRefund);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { id: bookingId, stripePaymentIntentId: intentId },
      data: { paymentStatus: isFullRefund ? "refunded" : "partially_refunded" },
    });

    await tx.marketplaceTransaction.updateMany({
      where: { bookingId, providerPaymentId: typeof charge.payment_intent === "string" ? charge.payment_intent : undefined },
      data: {
        status: isFullRefund ? "refunded" : "partially_refunded",
        refundedAt: new Date(),
      },
    });
  });

  await writeAuditLog({
    event: "payment_refunded",
    category: "payment",
    level: "info",
    targetType: "Booking",
    targetId: bookingId,
    metadata: { chargeId: charge.id, amountRefunded: fromMinorUnits(charge.amount_refunded), fullRefund: isFullRefund },
  });
}

async function handleChargebackCreated(dispute: Stripe.Dispute) {
  const paymentIntentId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : undefined;
  if (!paymentIntentId) return;

  const booking = await prisma.booking.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
  if (!booking) return;

  await writeAuditLog({
    event: "chargeback_created",
    category: "payment",
    level: "critical",
    targetType: "Booking",
    targetId: booking.id,
    metadata: { disputeId: dispute.id, amount: fromMinorUnits(dispute.amount), reason: dispute.reason },
  });
}
