import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getRequestMetadata } from "@/lib/request-context";
import { writeAuditLog } from "@/lib/audit-log";

export async function requireAuth(options: { roles?: UserRole[]; redirectTo?: string } = {}) {
  const session = await auth();

  if (!session?.user) {
    redirect(options.redirectTo ?? "/login");
  }

  if (options.roles?.length && !options.roles.includes(session.user.role)) {
    const requestMetadata = await getRequestMetadata();

    await writeAuditLog({
      event: "authz_fail",
      category: "authorization",
      level: "warn",
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
      requestId: requestMetadata.requestId,
      metadata: {
        requiredRoles: options.roles,
        actualRole: session.user.role,
      },
    });

    redirect("/");
  }

  return session;
}
