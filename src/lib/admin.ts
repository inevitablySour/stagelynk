import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

/** Returns the admin session, or a 403 response to return directly. */
export async function requireAdmin(): Promise<{ session: Session; denied?: never } | { session?: never; denied: NextResponse }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { denied: NextResponse.json({ success: false, message: "Admin access required." }, { status: 403 }) };
  }
  return { session };
}
