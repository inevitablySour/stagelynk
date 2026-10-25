import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminDisputesManager } from "@/components/admin/admin-disputes-manager";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminDisputesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  return (
    <AdminShell title="Open disputes" description="Review and resolve booking disputes requiring admin action.">
      <AdminDisputesManager />
    </AdminShell>
  );
}
