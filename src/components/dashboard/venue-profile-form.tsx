"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VENUE_TYPES } from "@/config";

interface VenueProfileFormProps {
  initial: {
    venueName: string;
    description: string;
    location: string;
    capacity: number;
    venueType: string;
  };
}

export function VenueProfileForm({ initial }: VenueProfileFormProps) {
  const router = useRouter();
  const [venueName, setVenueName] = useState(initial.venueName);
  const [location, setLocation] = useState(initial.location);
  const [description, setDescription] = useState(initial.description);
  const [capacity, setCapacity] = useState(initial.capacity);
  const [venueType, setVenueType] = useState(initial.venueType);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/venues/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueName,
          location,
          description,
          capacity: Number(capacity) || 0,
          venueType,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.message ?? "Unable to save profile.");
        return;
      }
      setMessage("Profile saved.");
      router.refresh();
    } catch {
      setMessage("Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Venue Details</CardTitle>
        <CardDescription>Keep your venue information current for artists you contact.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Venue name</label>
            <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Location</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Capacity</label>
            <Input type="number" min={0} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Venue type</label>
          <div className="flex flex-wrap gap-2">
            {VENUE_TYPES.map((type) => (
              <button key={type} type="button" onClick={() => setVenueType(type)}>
                <Badge variant={venueType === type ? "default" : "outline"}>{type}</Badge>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Description</label>
          <textarea
            className="min-h-32 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </Button>
          {message && <span className="text-sm text-stone-500">{message}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
