"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Preferences {
  bookingRequests: boolean;
  bookingUpdates: boolean;
  newReviews: boolean;
  jobAlerts: boolean;
  marketingEmails: boolean;
}

const ITEMS: { key: keyof Preferences; label: string; description: string }[] = [
  { key: "bookingRequests", label: "New booking requests", description: "Get notified when a client sends a booking request" },
  { key: "bookingUpdates", label: "Booking updates", description: "Updates on accepted, declined, or completed bookings" },
  { key: "newReviews", label: "New reviews", description: "When someone leaves a review on your profile" },
  { key: "jobAlerts", label: "Job alerts", description: "New projects matching your skills and categories" },
  { key: "marketingEmails", label: "Marketing emails", description: "Tips, feature updates, and platform news" },
];

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) setPreferences(json.data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!preferences) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to save preferences.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Unable to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-olive-100 text-olive-600">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Choose what you want to be notified about</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preferences ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : (
          <>
            {ITEMS.map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-900">{item.label}</p>
                  <p className="text-xs text-stone-500">{item.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences[item.key]}
                  onChange={(e) => setPreferences((prev) => (prev ? { ...prev, [item.key]: e.target.checked } : prev))}
                  className="h-4 w-4 rounded border-stone-300 text-olive-600 focus:ring-olive-500"
                />
              </div>
            ))}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && <p className="text-sm text-emerald-600">Preferences saved.</p>}
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save preferences"}</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
