import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";

const log = getLogger("stripe-connect-webhook");

/**
 * Handles v2 Connect account events, delivered via a Stripe "Event
 * Destination" (not the classic v1 webhook endpoint used in
 * /api/stripe/webhook). v2 accounts report capability status as
 * active/pending/rejected/restricted/unsupported rather than the v1
 * payouts_enabled/details_submitted booleans — see
 * .claude/skills/stripe-connect/SKILL.md.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await request.text();

  let notification: Stripe.V2.Core.EventNotification;
  try {
    notification = stripe.parseEventNotification(rawBody, signature, webhookSecret);
  } catch (error) {
    log.warn({ err: error }, "Stripe Connect webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (notification.type === "v2.core.account[configuration.recipient].capability_status_updated") {
      await syncRecipientCapabilityStatus(notification);
    }
  } catch (error) {
    log.error({ err: error, eventType: notification.type }, "Error handling Stripe Connect webhook event");
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function syncRecipientCapabilityStatus(
  notification: Extract<
    Stripe.V2.Core.EventNotification,
    { type: "v2.core.account[configuration.recipient].capability_status_updated" }
  >
) {
  const account = await notification.fetchRelatedObject();
  const accountId = account.id;

  const stripeTransfersStatus =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;

  await prisma.musicianProfile.updateMany({
    where: { stripeConnectAccountId: accountId },
    data: {
      stripeOnboardingComplete: Boolean(account.configuration?.recipient?.applied),
      stripePayoutsEnabled: stripeTransfersStatus === "active",
    },
  });
}
