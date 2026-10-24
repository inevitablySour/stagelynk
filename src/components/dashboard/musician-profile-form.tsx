"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HierarchicalPicker } from "@/components/common/hierarchical-picker";
import { GENRE_GROUPS, SERVICES } from "@/config";

const GENRE_PICKER_GROUPS = GENRE_GROUPS.map((g) => ({
  id: g.slug, name: g.name, children: g.subgenres.map((s) => ({ id: s.slug, name: s.name })),
}));
const OTHER_SLUGS = new Set(GENRE_GROUPS.flatMap((g) => g.subgenres.filter((s) => s.isOther).map((s) => s.slug)));

interface MusicianProfileFormProps {
  initial: {
    stageName: string;
    bio: string;
    location: string;
    experienceYears: number;
    mainGenreGroupSlug: string | null;
    genreSubtypeSlugs: string[];
    genreCustomLabel: string | null;
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
  const [mainGenreGroup, setMainGenreGroup] = useState<string | null>(initial.mainGenreGroupSlug);
  const [genreSubtypes, setGenreSubtypes] = useState<string[]>(initial.genreSubtypeSlugs);
  const [customLabel, setCustomLabel] = useState(initial.genreCustomLabel ?? "");
  const [serviceSlugs, setServiceSlugs] = useState<string[]>(initial.serviceSlugs);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedOtherSlug = genreSubtypes.find((slug) => OTHER_SLUGS.has(slug));

  const toggleGenreGroup = (groupId: string) => {
    // single-select-group: picking a new main genre clears prior subgenre picks
    setMainGenreGroup((prev) => (prev === groupId ? null : groupId));
    setGenreSubtypes([]);
    setCustomLabel("");
  };

  const toggleGenreSubtype = (slug: string) => {
    setGenreSubtypes((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

  const toggleService = (slug: string) => {
    setServiceSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

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
          services: serviceSlugs,
          ...(mainGenreGroup
            ? {
                mainGenreGroupSlug: mainGenreGroup,
                genrePicks: genreSubtypes.map((subtypeSlug) => ({
                  subtypeSlug,
                  ...(OTHER_SLUGS.has(subtypeSlug) ? { customLabel: customLabel.trim() } : {}),
                })),
              }
            : {}),
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
          <label className="mb-2 block text-sm font-medium">Genre</label>
          <p className="mb-2 text-xs text-stone-500">Pick one main genre, then 1-3 subgenres within it.</p>
          <HierarchicalPicker
            groups={GENRE_PICKER_GROUPS}
            selectedGroupIds={mainGenreGroup ? [mainGenreGroup] : []}
            selectedChildIds={genreSubtypes}
            onGroupToggle={toggleGenreGroup}
            onChildToggle={toggleGenreSubtype}
            maxChildrenPerGroup={3}
            mode="single-select-group"
            groupLabel="Main genre"
            childLabel="Subgenre"
          />
          {selectedOtherSlug && (
            <Input
              className="mt-2 max-w-sm"
              placeholder="Describe your custom genre tag"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
            />
          )}
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
        {initial.instruments.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium">Instruments</label>
            <p className="mb-2 text-xs text-stone-500">Set from your category &amp; role picks below.</p>
            <div className="flex flex-wrap gap-2">
              {initial.instruments.map((instrument) => (
                <Badge key={instrument} variant="secondary">{instrument}</Badge>
              ))}
            </div>
          </div>
        )}
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
