import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { auth } from "@/lib/auth";
import { PaymentMethodsManager } from "@/components/dashboard/payment-methods-manager";

export default async function VenuePaymentMethodsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-stone-900">Payment Methods</h1>
          <p className="mt-1 text-stone-500">
            Add a card so you can accept Open Call applications and send Direct Hire requests.
          </p>

          <PaymentMethodsManager />
        </div>
      </main>
    </div>
  );
}
