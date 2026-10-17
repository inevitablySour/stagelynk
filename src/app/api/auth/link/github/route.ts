import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyLinkState, LINK_STATE_COOKIE } from "@/lib/account-linking";
import { writeAuditLog } from "@/lib/audit-log";
import { getRequestMetadata } from "@/lib/request-context";
import { getLogger } from "@/lib/logger";
import { sendAccountLinkedEmail } from "@/lib/email-templates";

const log = getLogger("account-link");

function redirectToSettings(request: Request, status: "linked" | "error", reason?: string) {
  const url = new URL("/settings", request.url);
  if (status === "linked") url.searchParams.set("linked", "github");
  else url.searchParams.set("linkError", reason ?? "unknown");
  const response = NextResponse.redirect(url);
  response.cookies.delete(LINK_STATE_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return redirectToSettings(request, "error", "denied");
  }

  if (!code || !state) {
    return redirectToSettings(request, "error", "invalid_request");
  }

  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${LINK_STATE_COOKIE}=`))
    ?.slice(LINK_STATE_COOKIE.length + 1);

  if (!cookieState || cookieState !== state) {
    return redirectToSettings(request, "error", "state_mismatch");
  }

  const verification = verifyLinkState(state, { userId: session.user.id, provider: "github" });
  if (!verification.valid) {
    return redirectToSettings(request, "error", "state_invalid");
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectToSettings(request, "error", "not_configured");
  }

  try {
    const redirectUri = new URL("/api/auth/link/github", request.url).toString();

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenJson.access_token) {
      log.error({ tokenJson }, "GitHub token exchange failed during account linking");
      return redirectToSettings(request, "error", "token_exchange_failed");
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}`, Accept: "application/json" },
    });
    const githubUser = (await userRes.json()) as { id: number; login: string };

    if (!githubUser.id) {
      return redirectToSettings(request, "error", "profile_fetch_failed");
    }

    const providerAccountId = String(githubUser.id);

    const existingAccount = await prisma.account.findUnique({
      where: { provider_providerAccountId: { provider: "github", providerAccountId } },
    });

    if (existingAccount) {
      if (existingAccount.userId === session.user.id) {
        return redirectToSettings(request, "linked");
      }
      return redirectToSettings(request, "error", "already_linked_elsewhere");
    }

    await prisma.account.create({
      data: {
        userId: session.user.id,
        type: "oauth",
        provider: "github",
        providerAccountId,
      },
    });

    const requestMetadata = await getRequestMetadata();
    await writeAuditLog({
      event: "account_link_success",
      category: "auth",
      level: "info",
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      requestId: requestMetadata.requestId,
      targetType: "User",
      targetId: session.user.id,
      metadata: { provider: "github", githubLogin: githubUser.login },
    });

    if (session.user.email) {
      sendAccountLinkedEmail({ email: session.user.email, name: session.user.name ?? undefined }, "github").catch(
        (err) => log.error({ err }, "Failed to send account linked email")
      );
    }

    return redirectToSettings(request, "linked");
  } catch (err) {
    log.error({ err }, "Account linking failed");
    return redirectToSettings(request, "error", "unexpected_error");
  }
}
