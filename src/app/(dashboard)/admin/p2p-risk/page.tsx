import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/marketplace-fees";
import { listP2PRisk } from "@/lib/p2p-risk";
import { P2P_VOLUME_WINDOW_DAYS } from "@/lib/p2p-policy";

export default async function AdminP2PRiskPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");
  const rows = await listP2PRisk();

  return (
    <AdminShell title="Collaboration payments" description={`Artists who paid for P2P deals in the last ${P2P_VOLUME_WINDOW_DAYS} days, with signals that suggest venue-style use of the reduced fee.`}>
      {rows.length === 0 ? (
        <div className="empty-state"><p className="text-sm text-muted">No paid collaboration deals in this period.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Payer</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Deals</th><th className="px-4 py-3">Payees</th><th className="px-4 py-3">Releases</th><th className="px-4 py-3">Age</th><th className="px-4 py-3">Flags</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.musicianId} className="border-b border-line last:border-0 align-top">
                  <td className="px-4 py-3"><Link href={`/artists/${r.musicianId}`} className="font-medium text-brand hover:underline">{r.stageName}</Link><p className="text-xs text-muted">{r.email}</p></td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(r.volume)}</td>
                  <td className="px-4 py-3 tabular-nums">{r.deals}</td>
                  <td className="px-4 py-3 tabular-nums">{r.distinctPayees}</td>
                  <td className="px-4 py-3 tabular-nums">{r.releases}</td>
                  <td className="px-4 py-3 tabular-nums">{r.accountAgeDays}d</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{r.flags.length === 0 ? <span className="text-muted">None</span> : r.flags.map((f) => <Badge key={f} variant="warning">{f}</Badge>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
