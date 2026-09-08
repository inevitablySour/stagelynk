import { NextResponse } from "next/server";
import { z } from "zod/v4";

const subscribeSchema = z.object({
  tierId: z.enum(["free", "pro", "enterprise"]),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = subscribeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid membership tier", errors: parsed.error.flatten() }, { status: 400 });
  }

  // TODO: Create Stripe checkout session or update venue membership
  return NextResponse.json({
    success: true,
    data: {
      tierId: parsed.data.tierId,
      checkoutUrl: "/pricing",
    },
  });
}
