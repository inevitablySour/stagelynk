import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listP2PRisk } from "@/lib/p2p-risk";

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ success: true, data: await listP2PRisk() });
}
