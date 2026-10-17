"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Users, DollarSign, MapPin, Eye, Sparkles, Star, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/marketplace-fees";
import type { JobListingStatus, JobApplicationStatus } from "@/types";

interface JobListingRow {
  id: string;
  title: string;
  eventDate: string | null;
  location: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  status: JobListingStatus;
  isPromoted: boolean;
  visibilityScore: number;
  _count: { applications: number };
}

interface ApplicantRow {
  id: string;
  coverMessage: string;
  proposedFee: number | null;
  status: JobApplicationStatus;
  createdAt: string;
  slot: { id: string; label: string } | null;
  musician: {
    id: string;
    stageName: string;
    location: string;
    rating: number;
    reviewCount: number;
    experienceYears: number;
    genres: string[];
  };
  fit: {
    genreFit: number;
    technicalFit: number;
    financialFit: number;
    overall: number;
  };
}

function statusVariant(s: JobListingStatus) {
  if (s === "published") return "success" as const;
  if (s === "draft") return "secondary" as const;
  if (s === "filled") return "default" as const;
  return "warning" as const;
}

function applicantStatusVariant(s: JobApplicationStatus) {
  if (s === "accepted") return "success" as const;
  if (s === "shortlisted") return "warning" as const;
  if (s === "submitted") return "secondary" as const;
  return "destructive" as const;
}

export function VenueJobsManager({ listings }: { listings: JobListingRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("");
  const [location, setLocation] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [slotLabelsInput, setSlotLabelsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const totalApplicants = listings.reduce((s, l) => s + l._count.applications, 0);
  const published = listings.filter((l) => l.status === "published").length;
  const promoted = listings.filter((l) => l.isPromoted).length;

  const handleCreate = async () => {
    setError(null);
    if (title.trim().length < 4 || description.trim().length < 20 || eventType.trim().length < 2) {
      setError("Title (4+ chars), event type, and a description (20+ chars) are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/venues/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          eventType: eventType.trim(),
          location: location.trim() || undefined,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          slotLabels: slotLabelsInput.trim()
            ? slotLabelsInput.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
          status: "draft",
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to create listing.");
        return;
      }
      setTitle("");
      setDescription("");
      setEventType("");
      setLocation("");
      setBudgetMin("");
      setBudgetMax("");
      setSlotLabelsInput("");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Unable to create listing.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id: string) => {
    setBusyId(id);
    try {
      await fetch(`/api/venues/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const toggleApplicants = async (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      return;
    }
    setExpandedJobId(jobId);
    setLoadingApplicants(true);
    try {
      const res = await fetch(`/api/venues/jobs/${jobId}/applications`);
      const json = await res.json();
      setApplicants(json.success ? json.data : []);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const decide = async (applicationId: string, decision: "accept" | "decline") => {
    setBusyId(applicationId);
    setActionError(null);
    try {
      const res = await fetch(`/api/venues/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (json.success) {
        setApplicants((prev) =>
          prev.map((a) => (a.id === applicationId ? { ...a, status: decision === "accept" ? "accepted" : "declined" } : a))
        );
        router.refresh();
      } else {
        setActionError(json.message ?? "That action couldn't be completed.");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Job Listings</h1>
          <p className="text-stone-500 mt-1">Post gig opportunities and review musician applications.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> New Listing
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-5 space-y-3">
            <Input placeholder="Title (e.g. DJ – Friday Residency)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="Event type (e.g. Club Night)" value={eventType} onChange={(e) => setEventType(e.target.value)} />
            <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Budget min" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
              <Input type="number" placeholder="Budget max" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
            </div>
            <div>
              <Input
                placeholder="Lineup slots, comma separated (e.g. Opener, Support, Co-headliner)"
                value={slotLabelsInput}
                onChange={(e) => setSlotLabelsInput(e.target.value)}
              />
              <p className="mt-1 text-xs text-stone-400">
                Leave blank for a single-slot booking. Applicants pick which slot they&apos;re applying for.
              </p>
            </div>
            <textarea
              className="min-h-24 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
              placeholder="Describe the opportunity (20+ characters)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={submitting}>
                {submitting ? "Saving..." : "Save as draft"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{published}</p><p className="text-xs text-stone-500">Published</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{totalApplicants}</p><p className="text-xs text-stone-500">Total applicants</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{listings.length}</p><p className="text-xs text-stone-500">Total listings</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-stone-900">{promoted}</p><p className="text-xs text-stone-500">Promoted</p></CardContent></Card>
      </div>

      <div className="space-y-4">
        {listings.length === 0 && (
          <p className="text-sm text-stone-500 text-center py-10">No job listings yet. Create your first one above.</p>
        )}
        {listings.map((listing) => (
          <Card key={listing.id}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-stone-900">{listing.title}</h3>
                    <Badge variant={statusVariant(listing.status)}>{listing.status}</Badge>
                    {listing.isPromoted && (
                      <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px]">
                        <Sparkles className="mr-0.5 h-3 w-3" />Promoted
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-stone-500 mt-1">
                    {listing.eventDate && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(listing.eventDate).toLocaleDateString()}</span>
                    )}
                    {listing.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.location}</span>}
                    {(listing.budgetMin > 0 || listing.budgetMax > 0) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatMoney(listing.budgetMin, listing.currency)} – {formatMoney(listing.budgetMax, listing.currency)}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{listing._count.applications} applicants</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.visibilityScore} views</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {listing._count.applications > 0 && (
                    <Button size="sm" variant="outline" onClick={() => toggleApplicants(listing.id)}>
                      {expandedJobId === listing.id ? "Hide Applicants" : "View Applicants"}
                    </Button>
                  )}
                  {listing.status === "draft" && (
                    <Button size="sm" onClick={() => handlePublish(listing.id)} disabled={busyId === listing.id}>
                      {busyId === listing.id ? "Publishing..." : "Publish"}
                    </Button>
                  )}
                </div>
              </div>

              {expandedJobId === listing.id && (
                <div className="mt-4 border-t border-stone-100 pt-4 space-y-3">
                  {actionError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}
                  {loadingApplicants && <p className="text-sm text-stone-500">Loading applicants...</p>}
                  {!loadingApplicants && applicants.length === 0 && <p className="text-sm text-stone-500">No applicants yet.</p>}
                  {!loadingApplicants &&
                    applicants.map((app) => (
                      <div key={app.id} className="rounded-lg border border-stone-100 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-stone-900">{app.musician.stageName}</span>
                              <Badge variant={applicantStatusVariant(app.status)} className="text-[10px]">{app.status}</Badge>
                              {app.slot && <Badge variant="outline" className="text-[10px]">{app.slot.label}</Badge>}
                              <Badge variant="secondary" className="text-[10px]">
                                Fit: {Math.round(app.fit.overall * 100)}%
                              </Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-500">
                              {app.musician.location && <span>{app.musician.location}</span>}
                              <span className="flex items-center gap-1"><Star className="h-3 w-3" />{app.musician.rating.toFixed(1)} ({app.musician.reviewCount})</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{app.musician.experienceYears}yr</span>
                              {app.proposedFee != null && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatMoney(app.proposedFee)}</span>}
                            </div>
                            <p className="mt-2 text-sm text-stone-600">{app.coverMessage}</p>
                          </div>
                          {(app.status === "submitted" || app.status === "shortlisted") && (
                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" onClick={() => decide(app.id, "accept")} disabled={busyId === app.id}>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Accept
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => decide(app.id, "decline")} disabled={busyId === app.id}>
                                <XCircle className="mr-1 h-3.5 w-3.5" /> Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
