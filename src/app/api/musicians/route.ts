import { NextResponse } from "next/server";
import { musicianProfileSchema } from "@/lib/validations";

export async function GET() {
  // TODO: Replace with prisma.musicianProfile.findMany({ include: { genres, albums } })
  return NextResponse.json({ success: true, data: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = musicianProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid musician profile", errors: parsed.error.flatten() }, { status: 400 });
  }

  // TODO: Create musician profile in database
  return NextResponse.json({ success: true, data: parsed.data }, { status: 201 });
}
