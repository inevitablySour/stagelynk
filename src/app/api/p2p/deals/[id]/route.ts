import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { placePeerHold, capturePeerHold, transferToPeer } from "@/lib/p2p-escrow";
import { payerBlockReason, resolveP2PFeeRate } from "@/lib/p2p-policy";
import { getLogger } from "@/lib/logger";

const log = getLogger("api-p2p-deals");

const bodySchema = z.object({
  action: z.enum(["accept", "decline", "cancel", "submit-milestone", "approve-milestone"]),
  milestoneId: z.string().optional(),
});

async function resolveDefaultPaymentMethod(stripeCustomerId: string) {
  const customer = await stripe.customers.retrieve(stripeCustomerId);
  const pm = !customer.deleted ? customer.invoice_settings.default_payment_method : null;
  return typeof pm === "string" ? pm : pm?.id ?? null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!me) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const { id } = await params;
  const deal = await prisma.p2PDeal.findUnique({ where: { id }, include: { milestones: true } });
  if (!deal) {
    return NextResponse.json({ success: false, message: "Deal not found" }, { status: 404 });
  }

  const match = await prisma.p2PMatch.findUnique({ where: { id: deal.matchId } });
  if (!match || (match.musicianAId !== me.id && match.musicianBId !== me.id)) {
    return NextResponse.json({ success: false, message: "Deal not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
  }
  const { action } = parsed.data;

  if (action === "decline" || action === "cancel") {
    if (deal.status !== "proposed" && !(action === "cancel" && deal.status === "accepted")) {
      return NextResponse.json({ success: false, message: "This deal can no longer be changed." }, { status: 400 });
    }
    const updated = await prisma.p2PDeal.update({
      where: { id },
      data: { status: action === "decline" ? "declined" : "cancelled" },
    });
    return NextResponse.json({ success: true, data: updated });
  }

  if (action === "accept") {
    if (deal.proposedBy === me.id) {
      return NextResponse.json({ success: false, message: "You can't accept your own proposal." }, { status: 400 });
    }
    if (deal.status !== "proposed") {
      return NextResponse.json({ success: false, message: "This deal has already been responded to." }, { status: 400 });
    }

    if (deal.dealType === "split_50_50") {
      const updated = await prisma.p2PDeal.update({ where: { id }, data: { status: "accepted" } });
      return NextResponse.json({ success: true, data: updated });
    }

    if (deal.dealType === "flat_fee") {
      const [payer, payee] = await Promise.all([
        prisma.musicianProfile.findUnique({ where: { id: deal.payerId! } }),
        prisma.musicianProfile.findUnique({ where: { id: deal.payeeId! } }),
      ]);
      if (!payer?.stripeCustomerId) {
        return NextResponse.json({ success: false, message: "The paying artist hasn't added a payment method yet." }, { status: 400 });
      }
      if (!payee?.stripeConnectAccountId || !payee.stripePayoutsEnabled) {
        return NextResponse.json({ success: false, message: "The receiving artist hasn't finished payout setup yet." }, { status: 400 });
      }

      const paymentMethodId = await resolveDefaultPaymentMethod(payer.stripeCustomerId);
      if (!paymentMethodId) {
        return NextResponse.json({ success: false, message: "The paying artist needs a default card on file." }, { status: 400 });
      }

      const blocked = await payerBlockReason(payer.id, match.conversationId);
      if (blocked) return NextResponse.json({ success: false, message: blocked }, { status: 403 });

      try {
        const { rate, reason } = await resolveP2PFeeRate({
          payerMusicianId: payer.id, payerUserId: payer.userId, paymentMethodId, amount: deal.rateAmount!,
        });
        const { paymentIntent } = await placePeerHold({
          payerCustomerId: payer.stripeCustomerId,
          payerPaymentMethodId: paymentMethodId,
          amount: deal.rateAmount!,
          currency: deal.currency,
          platformFeeRate: rate,
          metadata: { dealId: deal.id, feeReason: reason },
        });
        await capturePeerHold(paymentIntent.id);
        await transferToPeer({
          paymentIntentId: paymentIntent.id,
          payeeConnectAccountId: payee.stripeConnectAccountId,
          amount: deal.rateAmount!,
          currency: deal.currency,
          description: `P2P deal ${deal.id}`,
        });

        const updated = await prisma.p2PDeal.update({
          where: { id },
          data: { status: "completed", stripePaymentIntentId: paymentIntent.id, paidAt: new Date() },
        });
        return NextResponse.json({ success: true, data: updated });
      } catch (error) {
        log.warn({ err: error, dealId: id }, "P2P flat-fee charge failed");
        return NextResponse.json({ success: false, message: "The charge couldn't be completed. Check the payment method and try again." }, { status: 402 });
      }
    }

    // milestone
    const updated = await prisma.p2PDeal.update({ where: { id }, data: { status: "in_progress" } });
    return NextResponse.json({ success: true, data: updated });
  }

  if (action === "submit-milestone" || action === "approve-milestone") {
    if (deal.dealType !== "milestone") {
      return NextResponse.json({ success: false, message: "This deal has no milestones." }, { status: 400 });
    }
    if (!parsed.data.milestoneId) {
      return NextResponse.json({ success: false, message: "milestoneId is required." }, { status: 400 });
    }
    const milestone = deal.milestones.find((m) => m.id === parsed.data.milestoneId);
    if (!milestone) {
      return NextResponse.json({ success: false, message: "Milestone not found." }, { status: 404 });
    }

    if (action === "submit-milestone") {
      if (deal.payeeId !== me.id) {
        return NextResponse.json({ success: false, message: "Only the receiving artist can submit a milestone." }, { status: 403 });
      }
      if (milestone.status !== "pending") {
        return NextResponse.json({ success: false, message: "This milestone has already been submitted." }, { status: 400 });
      }
      const updated = await prisma.p2PMilestone.update({ where: { id: milestone.id }, data: { status: "submitted", submittedAt: new Date() } });
      return NextResponse.json({ success: true, data: updated });
    }

    // approve-milestone — this is where the per-milestone charge+transfer happens
    if (deal.payerId !== me.id) {
      return NextResponse.json({ success: false, message: "Only the paying artist can approve a milestone." }, { status: 403 });
    }
    if (milestone.status !== "submitted") {
      return NextResponse.json({ success: false, message: "This milestone hasn't been submitted yet." }, { status: 400 });
    }

    const [payer, payee] = await Promise.all([
      prisma.musicianProfile.findUnique({ where: { id: deal.payerId! } }),
      prisma.musicianProfile.findUnique({ where: { id: deal.payeeId! } }),
    ]);
    if (!payer?.stripeCustomerId) {
      return NextResponse.json({ success: false, message: "Add a payment method before approving a milestone." }, { status: 400 });
    }
    if (!payee?.stripeConnectAccountId || !payee.stripePayoutsEnabled) {
      return NextResponse.json({ success: false, message: "The receiving artist hasn't finished payout setup yet." }, { status: 400 });
    }

    const paymentMethodId = await resolveDefaultPaymentMethod(payer.stripeCustomerId);
    if (!paymentMethodId) {
      return NextResponse.json({ success: false, message: "Add a default card before approving a milestone." }, { status: 400 });
    }

    const blocked = await payerBlockReason(payer.id, match.conversationId);
    if (blocked) return NextResponse.json({ success: false, message: blocked }, { status: 403 });

    try {
      const { rate, reason } = await resolveP2PFeeRate({
        payerMusicianId: payer.id, payerUserId: payer.userId, paymentMethodId, amount: milestone.amount,
      });
      const { paymentIntent } = await placePeerHold({
        payerCustomerId: payer.stripeCustomerId,
        payerPaymentMethodId: paymentMethodId,
        amount: milestone.amount,
        currency: deal.currency,
        platformFeeRate: rate,
        metadata: { dealId: deal.id, milestoneId: milestone.id, feeReason: reason },
      });
      await capturePeerHold(paymentIntent.id);
      await transferToPeer({
        paymentIntentId: paymentIntent.id,
        payeeConnectAccountId: payee.stripeConnectAccountId,
        amount: milestone.amount,
        currency: deal.currency,
        description: `P2P milestone ${milestone.id} (deal ${deal.id})`,
      });

      const updatedMilestone = await prisma.p2PMilestone.update({
        where: { id: milestone.id },
        data: { status: "paid", approvedAt: new Date(), paidAt: new Date() },
      });

      const remaining = await prisma.p2PMilestone.count({ where: { dealId: deal.id, status: { not: "paid" } } });
      if (remaining === 0) {
        await prisma.p2PDeal.update({ where: { id: deal.id }, data: { status: "completed", paidAt: new Date() } });
      }

      return NextResponse.json({ success: true, data: updatedMilestone });
    } catch (error) {
      log.warn({ err: error, dealId: id, milestoneId: milestone.id }, "P2P milestone charge failed");
      return NextResponse.json({ success: false, message: "The charge couldn't be completed. Check the payment method and try again." }, { status: 402 });
    }
  }

  return NextResponse.json({ success: false, message: "Unsupported action." }, { status: 400 });
}
