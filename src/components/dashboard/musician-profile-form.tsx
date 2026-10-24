"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GENRES, SERVICES } from "@/config";

interface MusicianProfileFormProps {
  initial: {
    stageName: string;
    bio: string;
    location: string;
    experienceYears: number;
    genreSlugs: string[];
    serviceSlugs: string[];
    instruments: string[];
  };
}

export function MusicianProfileForm({ initial }: MusicianProfileFormProps) {
  const router = useRouter();
  const [stageName, setStageName] = useState(initial.stageName);
  const [location, setLocation] = useState(initial.location);
  const [bio, setBio] = useState(initial.bio);
  const [experienceYears, setExperienceYears] = useState(initial.experienceYears);
  const [genreSlugs, setGenreSlugs] = useState<string[]>(initial.genreSlugs);
  const [serviceSlugs, setServiceSlugs] = useState<string[]>(initial.serviceSlugs);
  const [instruments, setInstruments] = useState<string[]>(initial.instruments);
  const [instrumentInput, setInstrumentInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggleGenre = (slug: string) => {
    setGenreSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

  const toggleService = (slug: string) => {
    setServiceSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

  function addInstrument() {
    const value = instrumentInput.trim();
    if (value && !instruments.includes(value) && instruments.length < 20) {
      setInstruments((prev) => [...prev, value]);
    }
    setInstrumentInput("");
  }

  function removeInstrument(value: string) {
    setInstruments((prev) => prev.filter((i) => i !== value));
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/musicians/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageName,
          location,
          bio,
          experienceYears: Number(experienceYears) || 0,
          genres: genreSlugs,
          services: serviceSlugs,
          instruments,
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
        <CardTitle>Profile Details</CardTitle>
        <CardDescription>Keep your bio, location, and skills current.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Stage name</label>
            <Input value={stageName} onChange={(e) => setStageName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Location</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Years of experience</label>
          <Input
            type="number"
            min={0}
            max={100}
            value={experienceYears}
            onChange={(e) => setExperienceYears(Number(e.target.value))}
            className="max-w-[160px]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Bio</label>
          <textarea
            className="min-h-32 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Genres</label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <button key={genre.slug} type="button" onClick={() => toggleGenre(genre.slug)}>
                <Badge variant={genreSlugs.includes(genre.slug) ? "default" : "outline"}>{genre.name}</Badge>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Services you offer</label>
          <p className="mb-2 text-xs text-stone-500">What clients can book you for — separate from your genre or creative category.</p>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((service) => (
              <button key={service.slug} type="button" onClick={() => toggleService(service.slug)}>
                <Badge variant={serviceSlugs.includes(service.slug) ? "default" : "outline"}>{service.name}</Badge>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Instruments</label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Guitar, Vocals, Drums"
              value={instrumentInput}
              onChange={(e) => setInstrumentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addInstrument();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addInstrument}>
              Add
            </Button>
          </div>
          {instruments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {instruments.map((instrument) => (
                <Badge key={instrument} variant="secondary" className="flex items-center gap-1">
                  {instrument}
                  <button type="button" onClick={() => removeInstrument(instrument)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
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
