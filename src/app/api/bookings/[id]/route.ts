import { NextResponse } from "next/server";
import { z } from "zod/v4";

const updateBookingSchema = z.object({
  status: z.enum(["pending", "accepted", "declined", "completed", "cancelled"]).optional(),
  notes: z.string().max(1000).optional(),
  fee: z.number().min(0).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateBookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid booking update", errors: parsed.error.flatten() }, { status: 400 });
  }

  // TODO: Update booking and notify relevant user
  return NextResponse.json({ success: true, data: { id, ...parsed.data } });
}
