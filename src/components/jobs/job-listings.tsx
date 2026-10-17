"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Calendar, Users, Sparkles, Search, ArrowUpRight, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/marketplace-fees";
import { TechnicalGapAlert } from "@/components/equipment/technical-gap-alert";
import type { TechnicalGap } from "@/types";
import type { ApplicationFitScore } from "@/lib/application-fit";

export interface PublicJobListing {
  id: string;
  title: string;
  venueName: string;
  location: string;
  eventDate: string | null;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  genres: string[];
  applicantCount: number;
  isPromoted: boolean;
  slots?: { id: string; label: string; filled: boolean; reserved?: boolean; budgetMin?: number | null; budgetMax?: number | null }[];
  description?: string;
  externalVenueName?: string;
  venueAddress?: string;
  startTime?: string | null;
  endTime?: string | null;
  timeZone?: string;
  stageSpecs?: string;
  applicationDeadline?: string | null;
  equipmentProvided?: string[];
  useVenueEquipment?: boolean;
  requiredServices?: string[];
  technicalGaps?: TechnicalGap[];
  fit?: ApplicationFitScore;
}

interface JobListingsProps {
  jobs: PublicJobListing[];
  ctaLabel: string;
  ctaHref?: string;
  onApply?: (jobId: string, job?: PublicJobListing) => void;
  hideSearch?: boolean;
}

export function JobListings({ jobs, ctaLabel, ctaHref, onApply, hideSearch = false }: JobListingsProps) {
  const [query, setQuery] = useState("");

  const filtered = jobs.filter(
    (job) =>
      !query ||
      job.title.toLowerCase().includes(query.toLowerCase()) ||
      job.location.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {!hideSearch && <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          className="h-12 border-transparent bg-page/40 pl-10"
          aria-label="Search open calls by title or location"
          placeholder="Search by title or location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        </div>
        <p className="px-2 text-xs font-medium text-muted" role="status">{filtered.length} open {filtered.length === 1 ? "opportunity" : "opportunities"}</p>
      </div>}

      <div className="space-y-4">
        {filtered.length === 0 && <div className="empty-state py-16"><Briefcase className="mx-auto mb-4 h-9 w-9 text-brand" /><h3 className="text-lg font-semibold text-ink">{query ? "No matching open calls" : "The next opportunity is on its way"}</h3><p className="mt-2 text-sm text-muted">{query ? "Try a different title or a nearby location." : "Check back soon for new gigs and creative projects."}</p>{query && <Button variant="outline" className="mt-5" onClick={() => setQuery("")}>Clear search</Button>}</div>}
        {filtered.map((job) => (
          <Card key={job.id} className={`rounded-2xl transition-colors hover:border-brand/40 ${job.isPromoted ? "ring-1 ring-accent/40" : ""}`}>
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-brand-soft text-brand md:flex"><Briefcase className="h-6 w-6" /></div>
                <div className="flex-1 min-w-0">
                  <p className="mb-2 text-xs font-medium text-muted">{job.venueName}</p>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-lg font-semibold tracking-tight text-ink">{job.title}</h3>
                    {job.isPromoted && (
                      <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px]">
                        <Sparkles className="mr-0.5 h-3 w-3" />Promoted
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                    {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                    {job.eventDate && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(job.eventDate).toLocaleDateString()}</span>
                    )}
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.applicantCount} applicants</span>
                  </div>
                  {job.genres.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {job.genres.map((g) => <Badge key={g} variant="secondary" className="text-[10px]">{g.replaceAll("-", " ")}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-3 border-t border-line pt-4 sm:items-end sm:border-0 sm:pt-0">
                  <div className="sm:text-right"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Project budget</p><p className="mt-1 text-base font-semibold text-brand">{job.budgetMin > 0 || job.budgetMax > 0 ? `${formatMoney(job.budgetMin, job.currency)} – ${formatMoney(job.budgetMax, job.currency)}` : "Discuss with client"}</p></div>
                  {onApply ? (
                    <Button size="sm" disabled={Boolean(job.slots?.length) && !job.slots?.some((slot) => !slot.filled && !slot.reserved)} onClick={() => onApply(job.id, job)}>{ctaLabel}<ArrowUpRight className="ml-2 h-4 w-4" /></Button>
                  ) : (
                    <Button size="sm" asChild><Link href={ctaHref ?? "#"}>{ctaLabel}<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
                  )}
                </div>
              </div>
              <details className="mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-brand">Read brief, stage setup & lineup</summary>
                <div className="mt-4 space-y-4 text-sm">
                  <p className="whitespace-pre-line break-words leading-7 text-muted">{job.description || "No additional brief provided."}</p>
                  <p className="text-muted">{job.externalVenueName || job.venueName} · {job.venueAddress || job.location}<br />{job.eventDate} · {job.startTime || "TBD"}–{job.endTime || "TBD"} {job.timeZone}</p>
                  {job.applicationDeadline && <p className="text-xs text-muted">Apply before {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: job.timeZone ?? "UTC" }).format(new Date(job.applicationDeadline))} ({job.timeZone ?? "UTC"})</p>}
                  <div><h4 className="mb-2 font-semibold">Stage & technical setup</h4><p className="whitespace-pre-line leading-6 text-muted">{job.stageSpecs || "Confirm stage specifications with the client."}</p><p className="mt-2 text-xs text-muted">{job.useVenueEquipment ? "Technical matching uses the venue's current in-house equipment." : "Technical matching uses this event's equipment list."}</p>{job.equipmentProvided && job.equipmentProvided.length > 0 && <p className="mt-2 text-xs text-muted">{job.equipmentProvided.join(" · ")}</p>}</div>
                  {job.requiredServices && job.requiredServices.length > 0 && <p className="text-muted">Required services: {job.requiredServices.join(", ")}</p>}
                  {job.slots && <ul className="space-y-2">{job.slots.map((slot) => <li key={slot.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-line p-3"><span>{slot.label} · {slot.filled ? "Booked" : slot.reserved ? "Payment pending" : "Open"}</span><span className="font-medium text-brand">{formatMoney(slot.budgetMin ?? job.budgetMin, job.currency)}–{formatMoney(slot.budgetMax ?? job.budgetMax, job.currency)}</span></li>)}</ul>}
                  {job.fit && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{([["Overall", job.fit.overall], ["Genre", job.fit.genreFit], ["Technical", job.fit.technicalFit], ["Financial", job.fit.financialFit]] as const).map(([label, score]) => <p key={label} className="rounded-lg bg-brand-soft/60 p-3 text-xs">{label} fit <strong className="mt-1 block text-base text-brand">{Math.round(score * 100)}%</strong></p>)}</div>}
                  {job.technicalGaps && <TechnicalGapAlert gaps={job.technicalGaps} />}
                </div>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
