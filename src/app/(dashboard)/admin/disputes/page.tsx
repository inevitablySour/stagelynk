import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminDisputesManager } from "@/components/admin/admin-disputes-manager";

export default async function AdminDisputesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-sand-100">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-900">Open Disputes</h1>
          <p className="mt-1 text-stone-500">Review and resolve booking disputes requiring admin action.</p>
        </div>
        <AdminDisputesManager />
      </main>
    </div>
  );
}
