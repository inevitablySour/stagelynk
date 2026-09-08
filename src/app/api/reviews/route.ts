import { NextResponse } from "next/server";
import { reviewSchema } from "@/lib/validations";

export async function GET() {
  // TODO: Return reviews filtered by musician or venue
  return NextResponse.json({ success: true, data: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid review", errors: parsed.error.flatten() }, { status: 400 });
  }

  // TODO: Create review, update musician rating aggregate
  return NextResponse.json({ success: true, data: parsed.data }, { status: 201 });
}
