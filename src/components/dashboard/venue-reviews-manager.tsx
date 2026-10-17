"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/common/star-rating";
import { Button } from "@/components/ui/button";

export interface PendingReviewRow {
  bookingId: string;
  musicianId: string;
  musicianStageName: string;
  projectTitle: string;
  eventDate: string;
}

export interface GivenReviewRow {
  id: string;
  musicianStageName: string;
  projectTitle: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export function VenueReviewsManager({
  pending,
  given,
}: {
  pending: PendingReviewRow[];
  given: GivenReviewRow[];
}) {
  const router = useRouter();
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRows, setPendingRows] = useState(pending);

  const handleSubmit = async (bookingId: string, musicianId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, musicianId, rating, comment: comment.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to submit review.");
        return;
      }
      setPendingRows((prev) => prev.filter((p) => p.bookingId !== bookingId));
      setActiveBookingId(null);
      setComment("");
      setRating(5);
      router.refresh();
    } catch {
      setError("Unable to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {pendingRows.length > 0 && (
        <Card className="mb-6 border-accent/30">
          <CardHeader><CardTitle>Pending Reviews</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pendingRows.map((p) => (
              <div key={p.bookingId} className="rounded-lg border border-stone-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-stone-900">{p.musicianStageName}</h4>
                    <p className="text-xs text-stone-500">{p.projectTitle} · {new Date(p.eventDate).toLocaleDateString()}</p>
                  </div>
                  {activeBookingId !== p.bookingId && (
                    <Button size="sm" onClick={() => setActiveBookingId(p.bookingId)}>Write Review</Button>
                  )}
                </div>
                {activeBookingId === p.bookingId && (
                  <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" onClick={() => setRating(n)}>
                          <StarRating rating={n <= rating ? 5 : 0} maxStars={1} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="min-h-20 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
                      placeholder="Share how the performance went (optional)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={submitting} onClick={() => handleSubmit(p.bookingId, p.musicianId)}>
                        {submitting ? "Submitting..." : "Submit review"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActiveBookingId(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-stone-900">{given.length}</p><p className="text-xs text-stone-500">Reviews given</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-stone-900">{pendingRows.length}</p><p className="text-xs text-stone-500">Awaiting review</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Your Reviews</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {given.length === 0 && <p className="text-sm text-stone-500 text-center py-6">You haven&apos;t written any reviews yet.</p>}
          {given.map((review) => (
            <div key={review.id} className="border-b border-stone-100 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-stone-900">{review.musicianStageName}</span>
                <StarRating rating={review.rating} size="sm" />
              </div>
              <p className="text-sm text-stone-500 mb-1">Project: {review.projectTitle}</p>
              <p className="text-sm text-stone-600">{review.comment}</p>
              <span className="mt-1 block text-xs text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
