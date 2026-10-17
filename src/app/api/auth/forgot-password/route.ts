import { after, NextResponse } from "next/server";
import { createPasswordReset, passwordResetRequestSchema, RESET_REQUEST_MESSAGE } from "@/lib/password-recovery";
import { sendPasswordResetEmail } from "@/lib/email-templates";
import { getRequestMetadataFromHeaders } from "@/lib/request-context";
import { getLogger } from "@/lib/logger";

const log = getLogger("password-reset-request");
export async function POST(request: Request) {
  const parsed = passwordResetRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 });
  const metadata = getRequestMetadataFromHeaders(request.headers);
  try {
    const reset = await createPasswordReset(parsed.data.email, metadata.ipAddress);
    if (reset) after(async () => {
      await sendPasswordResetEmail({ email: reset.user.email, name: reset.user.name ?? undefined }, reset.token)
        .catch(() => log.error({ userId: reset.user.id }, "Password reset email delivery failed"));
    });
    return NextResponse.json({ success: true, message: RESET_REQUEST_MESSAGE }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch {
    log.error("Password reset service unavailable");
    return NextResponse.json({ success: false, message: "Unable to request a reset right now. Please try again shortly." }, { status: 503 });
  }
}
