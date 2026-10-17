"use client";

import { useEffect, useState } from "react";
import { JobListings, type PublicJobListing } from "@/components/jobs/job-listings";
import { Input } from "@/components/ui/input";
import { GENRES } from "@/config";

export function OpenCallFeed({ initial, canMatch = false, excludedIds = [], onApply, ctaLabel = "Sign up to apply", ctaHref = "/register" }: {
  initial: PublicJobListing[]; canMatch?: boolean; excludedIds?: string[];
  onApply?: (id: string, job?: PublicJobListing) => void; ctaLabel?: string; ctaHref?: string;
}) {
  const [jobs, setJobs] = useState(initial);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [subgenre, setSubgenre] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [technicalFit, setTechnicalFit] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (genre) params.set("genre", genre);
        if (subgenre) params.set("subgenre", subgenre);
        if (minBudget) params.set("minBudget", minBudget);
        if (maxBudget) params.set("maxBudget", maxBudget);
        if (technicalFit) params.set("technicalFit", "true");
        const response = await fetch(`/api/jobs?${params}`, { signal: controller.signal });
        const json = await response.json();
        if (!json.success) throw new Error(json.message || "Unable to refresh calls.");
        setJobs(json.data);
      } catch (err) { if (!controller.signal.aborted) setError((err as Error).message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, genre, subgenre, minBudget, maxBudget, technicalFit]);
  const visible = jobs.filter((job) => !excludedIds.includes(job.id));
  return <>
    <div className="mb-6 space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><label htmlFor="call-search" className="mb-2 block text-xs font-medium text-muted">Title / location</label><Input id="call-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search open calls" /></div>
        <div><label htmlFor="call-genre-filter" className="mb-2 block text-xs font-medium text-muted">Genre</label><select id="call-genre-filter" value={genre} onChange={(event) => setGenre(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"><option value="">All genres</option>{GENRES.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></div>
        <div><label htmlFor="call-min-budget" className="mb-2 block text-xs font-medium text-muted">Minimum compensation (EUR)</label><Input id="call-min-budget" type="number" min={0} value={minBudget} onChange={(event) => setMinBudget(event.target.value)} /></div>
        <div><label htmlFor="call-max-budget" className="mb-2 block text-xs font-medium text-muted">Maximum compensation (EUR)</label><Input id="call-max-budget" type="number" min={0} value={maxBudget} onChange={(event) => setMaxBudget(event.target.value)} /></div>
      </div>
      <div><label htmlFor="call-subgenre-filter" className="mb-2 block text-xs font-medium text-muted">Subgenre</label><Input id="call-subgenre-filter" value={subgenre} onChange={(event) => setSubgenre(event.target.value)} placeholder="e.g. dream pop" className="max-w-sm" /></div>
      {canMatch && <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={technicalFit} onChange={(event) => setTechnicalFit(event.target.checked)} />Only show events covering my technical rider</label>}
      <p role="status" className="text-xs text-muted">{loading ? "Refreshing open calls…" : `${visible.length} open opportunities`}</p>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error} Previous results may be out of date.</p>}
    <JobListings jobs={visible} hideSearch ctaLabel={ctaLabel} ctaHref={ctaHref} onApply={onApply} />
  </>;
}
