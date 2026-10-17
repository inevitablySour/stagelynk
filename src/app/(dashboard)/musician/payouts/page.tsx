import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PayoutsManager } from "@/components/dashboard/payouts-manager";

export default async function PayoutsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) redirect("/musician");

  const payouts = await prisma.payout.findMany({
    where: { musicianId: musician.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-stone-900">Payouts</h1>
          <p className="mt-1 text-stone-500">Connect a payout account to get paid for your bookings.</p>

          <PayoutsManager
            stripeOnboardingComplete={musician.stripeOnboardingComplete}
            stripePayoutsEnabled={musician.stripePayoutsEnabled}
            payouts={payouts.map((p) => ({
              id: p.id,
              amount: p.amount,
              currency: p.currency,
              status: p.status,
              scheduledFor: p.scheduledFor?.toISOString() ?? null,
              paidAt: p.paidAt?.toISOString() ?? null,
              createdAt: p.createdAt.toISOString(),
            }))}
          />
        </div>
      </main>
    </div>
  );
}
