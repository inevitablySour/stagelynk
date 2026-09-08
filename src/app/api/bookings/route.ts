import { NextResponse } from "next/server";
import { bookingRequestSchema } from "@/lib/validations";

export async function GET() {
  // TODO: Filter by authenticated user's role
  return NextResponse.json({ success: true, data: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = bookingRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid booking request", errors: parsed.error.flatten() }, { status: 400 });
  }

  // TODO: Create booking in database and notify artist
  return NextResponse.json({ success: true, data: parsed.data }, { status: 201 });
}
