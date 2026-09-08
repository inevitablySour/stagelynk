import { NextResponse } from "next/server";
import { venueProfileSchema } from "@/lib/validations";

export async function GET() {
  // TODO: Replace with prisma.venueProfile.findMany()
  return NextResponse.json({ success: true, data: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = venueProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid venue profile", errors: parsed.error.flatten() }, { status: 400 });
  }

  // TODO: Create venue profile in database
  return NextResponse.json({ success: true, data: parsed.data }, { status: 201 });
}
