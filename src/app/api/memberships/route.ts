import { NextResponse } from "next/server";
import { MEMBERSHIP_TIERS } from "@/config";

export async function GET() {
  return NextResponse.json({ success: true, data: MEMBERSHIP_TIERS });
}
