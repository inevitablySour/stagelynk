import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chargeBookingBalance } from "@/lib/balance-charges";
import { getLogger } from "@/lib/logger";

const log = getLogger("cron-balance-charges");

/** Charges deposit_balance bookings whose balance falls due (~48h before the event). */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.booking.findMany({
    where: {
      paymentStructure: "deposit_balance", paymentStatus: "paid", status: { in: ["accepted", "completed"] },
      balanceChargedAt: null, balanceDueAt: { lte: new Date() },
    },
    select: { id: true },
    take: 100,
  });

  let charged = 0;
  for (const { id } of due) {
    try {
      if ((await chargeBookingBalance(id)).charged) charged++;
    } catch (error) {
      log.error({ err: error, bookingId: id }, "Balance charge errored");
    }
  }
  return NextResponse.json({ success: true, due: due.length, charged });
}
