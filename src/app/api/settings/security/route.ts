import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";
import { getRequestMetadataFromHeaders } from "@/lib/request-context";
import { writeAuditLog } from "@/lib/audit-log";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendPasswordChangedEmail } from "@/lib/email-templates";

const log = getLogger("api-settings-security");

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "Use at least 8 characters").max(128),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Not signed in." }, { status: 401 });
  }

  const parsed = changePasswordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid password change", errors: parsed.error.flatten() }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;
  const userId = session.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, email: true, name: true } });
  if (!user?.passwordHash) {
    return NextResponse.json({ success: false, message: "This account signs in via Google or GitHub and has no password to change." }, { status: 400 });
  }
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    return NextResponse.json({ success: false, message: "Current password is incorrect." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), sessionVersion: { increment: 1 } },
  });

  const requestMetadata = getRequestMetadataFromHeaders(request.headers);
  await writeAuditLog({
    event: "password_changed",
    category: "auth",
    level: "warn",
    actorUserId: userId,
    ipAddress: requestMetadata.ipAddress,
    userAgent: requestMetadata.userAgent,
    requestId: requestMetadata.requestId,
    targetType: "User",
    targetId: userId,
  });

  if (user.email) {
    sendPasswordChangedEmail({ email: user.email, name: user.name ?? undefined }).catch(
      (err) => log.error({ err }, "Failed to send password changed email")
    );
  }

  return NextResponse.json({ success: true });
}
