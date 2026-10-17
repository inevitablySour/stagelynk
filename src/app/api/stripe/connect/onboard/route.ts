import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getLogger } from "@/lib/logger";

const log = getLogger("stripe-connect-onboard");

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "musician") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const musician = await prisma.musicianProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, stripeConnectAccountId: true, stageName: true },
  });

  if (!musician) {
    return NextResponse.redirect(new URL("/musician", request.url));
  }

  try {
    let accountId = musician.stripeConnectAccountId;

    if (!accountId) {
      // Musicians are Recipient accounts (separate charges & transfers model):
      // the platform charges the venue directly and later transfers the
      // musician's share. Musicians never take a card payment themselves,
      // so no Merchant configuration / card_payments capability is requested.
      const account = await stripe.v2.core.accounts.create({
        contact_email: session.user.email ?? undefined,
        display_name: musician.stageName,
        identity: {
          entity_type: "individual",
          country: "GB",
        },
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true },
              },
            },
          },
        },
        defaults: {
          responsibilities: {
            fees_collector: "application",
            losses_collector: "application",
          },
        },
        dashboard: "express",
      });
      accountId = account.id;

      await prisma.musicianProfile.update({
        where: { id: musician.id },
        data: { stripeConnectAccountId: accountId },
      });
    }

    const origin = new URL(request.url).origin;
    const accountLink = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          refresh_url: `${origin}/api/stripe/connect/onboard`,
          return_url: `${origin}/musician/payouts?onboarding=complete`,
        },
      },
    });

    return NextResponse.redirect(accountLink.url);
  } catch (error) {
    log.error({ err: error }, "Failed to start Stripe Connect onboarding");
    return NextResponse.redirect(new URL("/musician/payouts?error=onboarding_failed", request.url));
  }
}
