import { NextResponse } from "next/server";
import { musicianProfileSchema } from "@/lib/validations";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // TODO: Replace with prisma lookup
  return NextResponse.json({ success: true, data: { id } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = musicianProfileSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid musician profile update", errors: parsed.error.flatten() }, { status: 400 });
  }

  // TODO: Update musician profile in database
  return NextResponse.json({ success: true, data: { id, ...parsed.data } });
}
