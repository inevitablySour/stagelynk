import { after, NextResponse } from "next/server";
import { consumePasswordReset, passwordResetSchema } from "@/lib/password-recovery";
import { sendPasswordAddedEmail, sendPasswordChangedEmail } from "@/lib/email-templates";
import { getLogger } from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit-log";

const log = getLogger("password-reset");
export async function POST(request: Request) {
  const parsed = passwordResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Use a valid reset link and a password between 8 and 128 characters." }, { status: 400 });
  try {
    const user = await consumePasswordReset(parsed.data.token, parsed.data.password);
    if (!user) return NextResponse.json({ success: false, message: "This link is invalid, expired or already used. Request a new one." }, { status: 400 });
    const isSetup = user.kind === "setup";
    await writeAuditLog({ event: isSetup ? "password_setup_completed" : "password_reset_completed", category: "auth", level: "info", actorUserId: user.id, targetType: "User", targetId: user.id });
    after(async () => {
      const notify = isSetup ? sendPasswordAddedEmail : sendPasswordChangedEmail;
      await notify({ email: user.email, name: user.name ?? undefined })
        .catch(() => log.error({ userId: user.id }, "Password notification failed"));
    });
    const message = isSetup
      ? "Password set. Sign in with your email and new password, or keep using GitHub or Google."
      : "Password changed. Sign in again with your new password.";
    return NextResponse.json({ success: true, message }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    log.error("Password reset failed");
    return NextResponse.json({ success: false, message: "Unable to reset your password right now. Try again shortly." }, { status: 503 });
  }
}
