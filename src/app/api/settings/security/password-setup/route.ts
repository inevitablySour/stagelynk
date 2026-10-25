import { after, NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPasswordSetup } from "@/lib/password-recovery";
import { sendPasswordSetupEmail } from "@/lib/email-templates";
import { getRequestMetadataFromHeaders } from "@/lib/request-context";
import { writeAuditLog } from "@/lib/audit-log";
import { getLogger } from "@/lib/logger";

const log = getLogger("password-setup-request");

/** Emails the signed-in user a single-use link to add a password to a GitHub/Google-only account. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Not signed in." }, { status: 401 });

  const metadata = getRequestMetadataFromHeaders(request.headers);
  try {
    const result = await createPasswordSetup(session.user.id, metadata.ipAddress);
    if (result.status === "not_eligible") {
      return NextResponse.json({ success: false, message: "This account already has a password. Use the form to change it." }, { status: 400 });
    }
    if (result.status === "rate_limited") {
      return NextResponse.json({ success: false, message: "A link was sent moments ago. Check your inbox, or try again in a minute." }, { status: 429 });
    }
    const { user, token } = result;
    await writeAuditLog({
      event: "password_setup_requested", category: "auth", level: "info", actorUserId: user.id, targetType: "User", targetId: user.id,
      ipAddress: metadata.ipAddress, userAgent: metadata.userAgent, requestId: metadata.requestId,
    });
    after(async () => {
      await sendPasswordSetupEmail({ email: user.email, name: user.name ?? undefined }, token)
        .catch(() => log.error({ userId: user.id }, "Password setup email delivery failed"));
    });
    return NextResponse.json({ success: true, message: `We've emailed a link to ${user.email}. It works once and expires in 30 minutes.` }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    log.error("Password setup request failed");
    return NextResponse.json({ success: false, message: "Unable to send the link right now. Try again shortly." }, { status: 503 });
  }
}
