"use client";

import { useEffect, useState } from "react";
import { JobListings, type PublicJobListing } from "@/components/jobs/job-listings";
import { Input } from "@/components/ui/input";
import { HierarchicalPicker } from "@/components/common/hierarchical-picker";
import { GENRE_GROUPS } from "@/config";

const GENRE_PICKER_GROUPS = GENRE_GROUPS.map((g) => ({
  id: g.slug, name: g.name, children: g.subgenres.map((s) => ({ id: s.slug, name: s.name })),
}));

export function OpenCallFeed({ initial, canMatch = false, excludedIds = [], onApply, ctaLabel = "Sign up to apply", ctaHref = "/register" }: {
  initial: PublicJobListing[]; canMatch?: boolean; excludedIds?: string[];
  onApply?: (id: string, job?: PublicJobListing) => void; ctaLabel?: string; ctaHref?: string;
}) {
  const [jobs, setJobs] = useState(initial);
  const [query, setQuery] = useState("");
  const [genreGroup, setGenreGroup] = useState<string | null>(null);
  const [genre, setGenre] = useState("");
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
  }, [query, genre, minBudget, maxBudget, technicalFit]);
  const visible = jobs.filter((job) => !excludedIds.includes(job.id));
  return <>
    <div className="mb-6 space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><label htmlFor="call-search" className="mb-2 block text-xs font-medium text-muted">Title / location</label><Input id="call-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search open calls" /></div>
        <div><label htmlFor="call-min-budget" className="mb-2 block text-xs font-medium text-muted">Minimum compensation (EUR)</label><Input id="call-min-budget" type="number" min={0} value={minBudget} onChange={(event) => setMinBudget(event.target.value)} /></div>
        <div><label htmlFor="call-max-budget" className="mb-2 block text-xs font-medium text-muted">Maximum compensation (EUR)</label><Input id="call-max-budget" type="number" min={0} value={maxBudget} onChange={(event) => setMaxBudget(event.target.value)} /></div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted">Genre</p>
        <HierarchicalPicker
          groups={GENRE_PICKER_GROUPS}
          selectedGroupIds={genreGroup ? [genreGroup] : []}
          selectedChildIds={genre ? [genre] : []}
          onGroupToggle={(groupId) => { setGenreGroup((prev) => (prev === groupId ? null : groupId)); setGenre(""); }}
          onChildToggle={(slug) => setGenre((prev) => (prev === slug ? "" : slug))}
          maxChildrenPerGroup={1}
          mode="single-select-group"
          groupLabel="Genre"
          childLabel="Subgenre"
        />
      </div>
      {canMatch && <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={technicalFit} onChange={(event) => setTechnicalFit(event.target.checked)} />Only show events covering my technical rider</label>}
      <p role="status" className="text-xs text-muted">{loading ? "Refreshing open calls…" : `${visible.length} open opportunities`}</p>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error} Previous results may be out of date.</p>}
    <JobListings jobs={visible} hideSearch ctaLabel={ctaLabel} ctaHref={ctaHref} onApply={onApply} />
  </>;
}
