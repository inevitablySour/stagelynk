"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, DollarSign, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/marketplace-fees";
import type { JobListingStatus, JobApplicationStatus } from "@/types";

interface ProjectListingRow {
  id: string;
  title: string;
  deadline: string | null;
  budgetMin: number;
  budgetMax: number;
  hideBudget: boolean;
  currency: string;
  status: JobListingStatus;
  _count: { applications: number };
}

interface ApplicantRow {
  id: string;
  coverMessage: string;
  proposedFee: number | null;
  status: JobApplicationStatus;
  musician: { id: string; stageName: string; location: string; rating: number; reviewCount: number };
  booking: { paymentStatus: string; status: string } | null;
}

function statusVariant(s: JobListingStatus) {
  if (s === "published") return "success" as const;
  if (s === "draft" || s === "paused") return "warning" as const;
  if (s === "filled") return "secondary" as const;
  return "destructive" as const;
}

export function VenueProjectsManager({ listings }: { listings: ProjectListingRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [hideBudget, setHideBudget] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const handleCreate = async () => {
    setError(null);
    if (title.trim().length < 4 || description.trim().length < 20) {
      setError("Title (4+ chars) and a description (20+ chars) are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/venues/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          hideBudget,
          status: "draft",
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to create project.");
        return;
      }
      setTitle("");
      setDescription("");
      setDeadline("");
      setBudgetMin("");
      setBudgetMax("");
      setHideBudget(false);
      setShowForm(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id: string) => {
    setBusyId(id);
    try {
      await fetch(`/api/venues/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const toggleApplicants = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setLoadingApplicants(true);
    try {
      const res = await fetch(`/api/venues/projects/${id}/applications`);
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
      const res = await fetch(`/api/venues/project-applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.message ?? "That action couldn't be completed.");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">Project listings</h2>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" /> New project
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="space-y-3 p-5">
            <Input placeholder="Title (e.g. Soundtrack for short film)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea
              className="min-h-24 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
              placeholder="Describe the deliverable (20+ characters)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Budget min" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
              <Input type="number" placeholder="Budget max" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" checked={hideBudget} onChange={(e) => setHideBudget(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-olive-600 focus:ring-olive-500" />
              Hide this budget range from applicants
            </label>
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

      {actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}

      <div className="space-y-4">
        {listings.length === 0 && <p className="py-10 text-center text-sm text-stone-500">No project listings yet.</p>}
        {listings.map((listing) => (
          <Card key={listing.id}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-semibold text-stone-900">{listing.title}</h3>
                    <Badge variant={statusVariant(listing.status)}>{listing.status}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-500">
                    {listing.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due {new Date(listing.deadline).toLocaleDateString()}
                      </span>
                    )}
                    {!listing.hideBudget && (listing.budgetMin > 0 || listing.budgetMax > 0) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatMoney(listing.budgetMin, listing.currency)} – {formatMoney(listing.budgetMax, listing.currency)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {listing._count.applications} applicants
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {listing.status === "draft" && (
                    <Button size="sm" disabled={busyId === listing.id} onClick={() => handlePublish(listing.id)}>
                      Publish
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => toggleApplicants(listing.id)}>
                    Applicants
                  </Button>
                </div>
              </div>

              {expandedId === listing.id && (
                <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
                  {loadingApplicants && <p className="text-sm text-stone-500">Loading…</p>}
                  {!loadingApplicants && applicants.length === 0 && <p className="text-sm text-stone-500">No applicants yet.</p>}
                  {applicants.map((a) => (
                    <div key={a.id} className="rounded-lg border border-stone-100 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-stone-900">{a.musician.stageName}</p>
                          <p className="text-xs text-stone-500">{a.musician.location}</p>
                        </div>
                        <Badge variant={a.status === "accepted" ? "success" : a.status === "declined" ? "destructive" : "secondary"}>{a.status}</Badge>
                      </div>
                      {a.coverMessage && <p className="mt-2 text-sm text-stone-600">{a.coverMessage}</p>}
                      {a.proposedFee != null && <p className="mt-1 text-sm font-medium text-stone-900">Proposed: {formatMoney(a.proposedFee)}</p>}
                      {a.status === "submitted" && (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => decide(a.id, "decline")} disabled={busyId === a.id}>
                            Decline
                          </Button>
                          <Button size="sm" onClick={() => decide(a.id, "accept")} disabled={busyId === a.id}>
                            Accept & charge
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
