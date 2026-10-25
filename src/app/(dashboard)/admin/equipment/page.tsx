import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { EquipmentCatalogManager } from "@/components/admin/equipment-catalog-manager";

export default async function AdminEquipmentPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  return (
    <AdminShell
      title="Equipment catalog"
      description="Review synced software, curate the gear and tools creatives can list, and pull updates from Shopify's product taxonomy and Wikidata."
    >
      <EquipmentCatalogManager />
    </AdminShell>
  );
}
