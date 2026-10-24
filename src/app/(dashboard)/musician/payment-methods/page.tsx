import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN } from "@/config";
import { auth } from "@/lib/auth";
import { PaymentMethodsManager } from "@/components/dashboard/payment-methods-manager";

export default async function MusicianPaymentMethodsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-stone-900">Payment Methods</h1>
          <p className="mt-1 text-stone-500">
            Add a card so you can pay another artist directly in a P2P collaboration deal.
          </p>

          <PaymentMethodsManager
            endpoint="/api/musicians/me/payment-methods"
            description="Used only when you're the paying side of a P2P collaboration deal — never for being booked."
          />
        </div>
      </main>
    </div>
  );
}
