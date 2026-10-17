import { after, NextResponse } from "next/server";
import { consumePasswordReset, passwordResetSchema } from "@/lib/password-recovery";
import { sendPasswordChangedEmail } from "@/lib/email-templates";
import { getLogger } from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit-log";

const log = getLogger("password-reset");
export async function POST(request: Request) {
  const parsed = passwordResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Use a valid reset link and a password between 8 and 128 characters." }, { status: 400 });
  try {
    const user = await consumePasswordReset(parsed.data.token, parsed.data.password);
    if (!user) return NextResponse.json({ success: false, message: "This reset link is invalid, expired or already used. Request a new one." }, { status: 400 });
    await writeAuditLog({ event: "password_reset_completed", category: "auth", level: "info", actorUserId: user.id, targetType: "User", targetId: user.id });
    after(async () => {
      await sendPasswordChangedEmail({ email: user.email, name: user.name ?? undefined })
        .catch(() => log.error({ userId: user.id }, "Password changed notification failed"));
    });
    return NextResponse.json({ success: true, message: "Password changed. Sign in again with your new password." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    log.error("Password reset failed");
    return NextResponse.json({ success: false, message: "Unable to reset your password right now. Try again shortly." }, { status: 503 });
  }
}
