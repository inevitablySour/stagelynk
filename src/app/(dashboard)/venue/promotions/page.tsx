import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { PromotionsManager } from "@/components/dashboard/promotions-manager";
import { DASHBOARD_NAV_VENUE } from "@/config";
import { auth } from "@/lib/auth";
import { getPromotionsDashboard } from "@/lib/promotions";

export default async function VenuePromotionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "venue") redirect("/");
  const data = await getPromotionsDashboard(session.user.id);
  if (!data) redirect("/onboarding/role");
  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="venue" navItems={DASHBOARD_NAV_VENUE} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <PromotionsManager initial={data} />
        </div>
      </main>
    </div>
  );
}