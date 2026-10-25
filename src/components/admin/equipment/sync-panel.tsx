"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CircleCheck, History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { equipmentGroupLabel } from "@/lib/equipment-catalog/groups";
import { cn } from "@/lib/utils";
import { requestJson } from "@/components/admin/equipment/shared";

type Source = "shopify" | "wikidata";

interface Summary {
  counts: { added: number; updated: number; retired: number; unchanged: number; candidates: number };
  added: { name: string; category: string; group: string }[];
  updated: { name: string; fields: string[]; before: Record<string, string | null>; after: Record<string, string | null>; revived: boolean }[];
  retired: { name: string }[];
}

interface Run {
  id: string;
  source: Source;
  status: "previewed" | "applied" | "failed";
  version: string;
  summary: Summary | Record<string, never>;
  error: string | null;
  createdAt: string;
  appliedAt?: string | null;
}

const SOURCES: Record<Source, { title: string; blurb: string; addsAs: string }> = {
  shopify: {
    title: "Shopify product taxonomy",
    blurb: "Hardware and software categories from Shopify's open, versioned taxonomy (MIT). New categories go live straight away.",
    addsAs: "New items go live immediately",
  },
  wikidata: {
    title: "Wikidata named software",
    blurb: "Current named products (DAWs, editors, design and 3D tools) from Wikidata. Everything new waits in the review queue.",
    addsAs: "New items wait for your approval",
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function Counts({ counts }: { counts: Summary["counts"] }) {
  const tiles = [
    { label: "New", value: counts.added, tone: "text-emerald-700" },
    { label: "Changed", value: counts.updated, tone: "text-amber-700" },
    { label: "Retired", value: counts.retired, tone: "text-red-700" },
    { label: "Unchanged", value: counts.unchanged, tone: "text-muted" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-line bg-surface px-3 py-2">
          <p className={cn("text-xl font-bold tabular-nums", t.tone)}>{t.value}</p>
          <p className="text-[11px] text-muted">{t.label}</p>
        </div>
      ))}
    </div>
  );
}

function DiffDetails({ summary }: { summary: Summary }) {
  return (
    <div className="space-y-3 text-sm">
      {summary.added.length > 0 && (
        <details open={summary.added.length <= 30} className="rounded-xl border border-line bg-surface">
          <summary className="cursor-pointer px-3 py-2 font-medium text-ink">{summary.added.length} new</summary>
          <ul className="max-h-64 overflow-y-auto border-t border-line px-3 py-2">
            {summary.added.map((a) => (
              <li key={`${a.group}-${a.name}`} className="flex justify-between gap-3 py-0.5"><span className="truncate text-ink">{a.name}</span><span className="shrink-0 text-xs text-muted">{equipmentGroupLabel(a.group)} · {a.category}</span></li>
            ))}
          </ul>
        </details>
      )}
      {summary.updated.length > 0 && (
        <details open className="rounded-xl border border-line bg-surface">
          <summary className="cursor-pointer px-3 py-2 font-medium text-ink">{summary.updated.length} changed</summary>
          <ul className="max-h-64 overflow-y-auto border-t border-line px-3 py-2">
            {summary.updated.map((u) => (
              <li key={u.name} className="py-1">
                <span className="font-medium text-ink">{u.name}</span>{u.revived && <span className="ml-2 text-xs text-emerald-700">back in source</span>}
                {u.fields.map((f) => (
                  <p key={f} className="flex flex-wrap items-center gap-1 text-xs text-muted">{f}: <s>{u.before[f] ?? "—"}</s> <ArrowRight className="h-3 w-3" /> <span className="text-ink">{u.after[f] ?? "—"}</span></p>
                ))}
              </li>
            ))}
          </ul>
        </details>
      )}
      {summary.retired.length > 0 && (
        <details open className="rounded-xl border border-red-200 bg-red-50/50">
          <summary className="cursor-pointer px-3 py-2 font-medium text-red-800">{summary.retired.length} no longer in the source</summary>
          <p className="border-t border-red-200 px-3 pt-2 text-xs text-red-800">These stop appearing for new selections. Anyone already listing them keeps them.</p>
          <ul className="max-h-48 overflow-y-auto px-3 py-2 text-red-900">{summary.retired.map((r) => <li key={r.name}>{r.name}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

export function SyncPanel({ onApplied }: { onApplied: () => void }) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [preview, setPreview] = useState<Partial<Record<Source, Run>>>({});
  const [busy, setBusy] = useState<Source | null>(null);
  const [message, setMessage] = useState<Partial<Record<Source, { tone: "error" | "success"; text: string }>>>({});
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    requestJson<Run[]>("/api/admin/equipment/sync").then((r) => { if (!cancelled) setRuns(r); }).catch(() => { if (!cancelled) setRuns([]); });
    return () => { cancelled = true; };
  }, [refresh]);

  async function runPreview(source: Source) {
    setBusy(source);
    setMessage((m) => ({ ...m, [source]: undefined }));
    setPreview((p) => ({ ...p, [source]: undefined }));
    try {
      const run = await requestJson<Run>("/api/admin/equipment/sync", { method: "POST", body: JSON.stringify({ source }) });
      setPreview((p) => ({ ...p, [source]: run }));
    } catch (e) {
      setMessage((m) => ({ ...m, [source]: { tone: "error", text: (e as Error).message } }));
    } finally {
      setBusy(null);
      setRefresh((r) => r + 1);
    }
  }

  async function apply(source: Source, runId: string) {
    setBusy(source);
    try {
      const summary = await requestJson<Summary>(`/api/admin/equipment/sync/${runId}`, { method: "POST" });
      setPreview((p) => ({ ...p, [source]: undefined }));
      setMessage((m) => ({ ...m, [source]: { tone: "success", text: `Applied: ${summary.counts.added} new, ${summary.counts.updated} changed, ${summary.counts.retired} retired.` } }));
      onApplied();
    } catch (e) {
      setMessage((m) => ({ ...m, [source]: { tone: "error", text: (e as Error).message } }));
    } finally {
      setBusy(null);
      setRefresh((r) => r + 1);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {(Object.keys(SOURCES) as Source[]).map((source) => {
          const meta = SOURCES[source];
          const lastApplied = runs?.find((r) => r.source === source && r.status === "applied");
          const current = preview[source];
          const summary = current?.summary && "counts" in current.summary ? (current.summary as Summary) : null;
          const noChanges = summary && summary.counts.added + summary.counts.updated + summary.counts.retired === 0;
          const note = message[source];
          return (
            <section key={source} className="panel-soft flex flex-col gap-4 p-5">
              <div>
                <h3 className="font-semibold text-ink">{meta.title}</h3>
                <p className="mt-1 text-sm text-muted">{meta.blurb}</p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div><dt className="text-muted">Last applied</dt><dd className="font-medium text-ink">{runs === null ? <span className="inline-block h-4 w-28 animate-pulse rounded bg-surface-strong align-middle" /> : lastApplied?.appliedAt ? formatDate(lastApplied.appliedAt) : "Never"}</dd></div>
                <div><dt className="text-muted">Version</dt><dd className="font-medium text-ink">{runs === null ? <span className="inline-block h-4 w-16 animate-pulse rounded bg-surface-strong align-middle" /> : lastApplied?.version || "—"}</dd></div>
              </dl>
              {note && (
                <p role={note.tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-xl px-3 py-2 text-sm", note.tone === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800")}>
                  {note.tone === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />}{note.text}
                </p>
              )}
              {summary && (
                <div className="space-y-3 rounded-2xl border border-line bg-page/40 p-4">
                  <p className="text-xs font-medium text-muted">Preview · {current?.version} · {summary.counts.candidates} items in source</p>
                  <Counts counts={summary.counts} />
                  {noChanges ? <p className="text-sm text-muted">The catalog already matches this source.</p> : <DiffDetails summary={summary} />}
                  <div className="flex flex-wrap items-center gap-2">
                    {!noChanges && <Button onClick={() => apply(source, current!.id)} disabled={busy !== null}>{busy === source ? "Applying…" : "Apply these changes"}</Button>}
                    <Button variant="ghost" onClick={() => setPreview((p) => ({ ...p, [source]: undefined }))} disabled={busy !== null}>Discard</Button>
                    {!noChanges && <span className="text-xs text-muted">{meta.addsAs}</span>}
                  </div>
                </div>
              )}
              <div className="mt-auto">
                <Button variant="outline" onClick={() => runPreview(source)} disabled={busy !== null}>
                  <RefreshCw className={cn("h-4 w-4", busy === source && "animate-spin")} />
                  {busy === source && !summary ? "Checking source…" : "Check for updates"}
                </Button>
                <p className="mt-2 text-xs text-muted">Downloads and validates the source, then shows what would change. Nothing is saved until you apply.</p>
              </div>
            </section>
          );
        })}
      </div>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><History className="h-4 w-4" /> Recent sync runs</h3>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {runs === null ? <div className="h-24 animate-pulse bg-surface-strong" /> : runs.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">No syncs yet.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {runs.map((run) => {
                const c = "counts" in run.summary ? (run.summary as Summary).counts : null;
                return (
                  <li key={run.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                    <span className="w-40 text-xs text-muted">{formatDate(run.createdAt)}</span>
                    <span className="w-20 font-medium capitalize text-ink">{run.source}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", run.status === "applied" ? "bg-emerald-100 text-emerald-800" : run.status === "failed" ? "bg-red-100 text-red-700" : "bg-stone-200 text-stone-700")}>{run.status}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">
                      {run.error ?? (c ? `${c.added} new · ${c.updated} changed · ${c.retired} retired · ${c.unchanged} unchanged` : "")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
