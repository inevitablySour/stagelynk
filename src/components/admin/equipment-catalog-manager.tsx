"use client";

import { useEffect, useState } from "react";
import { Inbox, Library, PlusCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { requestJson, type AdminListResponse } from "@/components/admin/equipment/shared";
import { ReviewQueue } from "@/components/admin/equipment/review-queue";
import { CatalogBrowser } from "@/components/admin/equipment/catalog-browser";
import { SyncPanel } from "@/components/admin/equipment/sync-panel";
import { AddItems } from "@/components/admin/equipment/add-items";

type Tab = "review" | "catalog" | "sync" | "add";

export function EquipmentCatalogManager() {
  const [tab, setTab] = useState<Tab>("review");
  const [counts, setCounts] = useState<AdminListResponse["counts"] | null>(null);
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    requestJson<AdminListResponse>("/api/admin/equipment?pageSize=10").then((d) => { if (!cancelled) setCounts(d.counts); }).catch(() => {});
    return () => { cancelled = true; };
  }, [version]);

  const pending = counts?.status.pending ?? 0;
  const tabs: { key: Tab; label: string; icon: typeof Inbox; badge?: number }[] = [
    { key: "review", label: "Review", icon: Inbox, badge: pending },
    { key: "catalog", label: "Catalog", icon: Library },
    { key: "sync", label: "Sync sources", icon: RefreshCw },
    { key: "add", label: "Add items", icon: PlusCircle },
  ];

  const stats = [
    { label: "Live in pickers", value: counts?.status.active },
    { label: "Awaiting review", value: counts?.status.pending },
    { label: "From Shopify", value: counts?.source.shopify },
    { label: "From Wikidata", value: counts?.source.wikidata },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel-soft p-4">
            <p className="text-2xl font-bold tabular-nums text-ink">{s.value ?? (counts ? 0 : "–")}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1 sm:flex">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:justify-start sm:px-4", tab === key ? "bg-brand text-surface shadow-sm" : "text-muted hover:bg-surface-strong hover:text-ink")}
          >
            <Icon className="h-4 w-4" /> {label}
            {badge ? <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", tab === key ? "bg-surface/20" : "bg-amber-100 text-amber-800")}>{badge}</span> : null}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "review" && <ReviewQueue onChanged={bump} />}
        {tab === "catalog" && <CatalogBrowser refreshKey={version} onChanged={bump} />}
        {tab === "sync" && <SyncPanel onApplied={bump} />}
        {tab === "add" && <AddItems onAdded={bump} />}
      </div>
    </div>
  );
}
