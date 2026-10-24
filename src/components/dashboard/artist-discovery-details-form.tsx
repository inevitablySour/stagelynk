"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProfileArtwork } from "@/components/artists/profile-artwork";
import { HierarchicalPicker } from "@/components/common/hierarchical-picker";
import { CATEGORY_GROUPS } from "@/config";

const CATEGORY_PICKER_GROUPS = CATEGORY_GROUPS.map((g) => ({
  id: g.slug, name: g.name, children: g.subcategories.map((s) => ({ id: s.slug, name: s.name })),
}));
const INSTRUMENTALIST_SLUG = "instrumentalist-session-musician";
const INSTRUMENT_TYPES = CATEGORY_GROUPS
  .flatMap((g) => g.subcategories)
  .find((s) => s.slug === INSTRUMENTALIST_SLUG)?.instrumentTypes ?? [];

export interface CategoryPick {
  subtypeSlug: string;
  instrumentTypeSlug?: string;
}

export interface DiscoveryDetails {
  categoryPicks: CategoryPick[];
  influences: string[];
  favorites: string[];
  performanceFee: number | null;
  hourlyFee: number | null;
  dayFee: number | null;
  profileImage: string | null;
  bannerImage: string | null;
}

export function ArtistDiscoveryDetailsForm({ initial }: { initial: DiscoveryDetails }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [profileImage, setProfileImage] = useState(initial.profileImage ?? "");
  const [bannerImage, setBannerImage] = useState(initial.bannerImage ?? "");

  const groupIds = Array.from(new Set(
    initial.categoryPicks.map((p) => CATEGORY_GROUPS.find((g) => g.subcategories.some((s) => s.slug === p.subtypeSlug))?.slug).filter((v): v is string => Boolean(v))
  ));
  const [selectedGroups, setSelectedGroups] = useState<string[]>(groupIds);
  const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>(initial.categoryPicks.map((p) => p.subtypeSlug));
  const [instrumentTypes, setInstrumentTypes] = useState<string[]>(
    initial.categoryPicks.filter((p) => p.instrumentTypeSlug).map((p) => p.instrumentTypeSlug!)
  );

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) => {
      if (prev.includes(groupId)) {
        const group = CATEGORY_PICKER_GROUPS.find((g) => g.id === groupId);
        if (group) {
          const childIds = new Set(group.children.map((c) => c.id));
          setSelectedSubtypes((cur) => cur.filter((id) => !childIds.has(id)));
          if (groupId === CATEGORY_GROUPS.find((g) => g.slug === "music-audio-production")?.slug) setInstrumentTypes([]);
        }
        return prev.filter((g) => g !== groupId);
      }
      return [...prev, groupId];
    });
  };
  const toggleSubtype = (slug: string) => {
    setSelectedSubtypes((prev) => {
      if (prev.includes(slug)) {
        if (slug === INSTRUMENTALIST_SLUG) setInstrumentTypes([]);
        return prev.filter((s) => s !== slug);
      }
      return [...prev, slug];
    });
  };
  const toggleInstrumentType = (slug: string) => {
    setInstrumentTypes((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

  const isInstrumentalistSelected = selectedSubtypes.includes(INSTRUMENTALIST_SLUG);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rate = (key: string) => data.get(key) === "" ? null : Number(data.get(key));

    const categoryPicks: CategoryPick[] = selectedSubtypes.map((subtypeSlug) =>
      subtypeSlug === INSTRUMENTALIST_SLUG
        ? instrumentTypes.map((instrumentTypeSlug) => ({ subtypeSlug, instrumentTypeSlug }))
        : [{ subtypeSlug }]
    ).flat();
    // An Instrumentalist pick with no instrument types chosen yet still counts as a role pick.
    const finalPicks = categoryPicks.length ? categoryPicks
      : selectedSubtypes.includes(INSTRUMENTALIST_SLUG) ? [{ subtypeSlug: INSTRUMENTALIST_SLUG }] : [];

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/musicians/me", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryPicks: finalPicks,
          influences: String(data.get("influences") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
          favorites: [0, 1, 2, 3].map((index) => String(data.get(`favorite-${index}`) ?? "").trim()).filter(Boolean),
          performanceFee: rate("performanceFee"), hourlyFee: rate("hourlyFee"), dayFee: rate("dayFee"), profileImage, bannerImage,
        }),
      });
      const json = await response.json();
      setMessage(json.success ? "Discovery details saved." : (json.message ?? "Check your selections, HTTP(S) image URLs and non-negative rates (up to two decimals)."));
      if (json.success) router.refresh();
    } catch { setMessage("Unable to save. Please try again."); }
    finally { setSaving(false); }
  }
  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>Discovery & creative identity</CardTitle><CardDescription>Help clients understand your style and financial fit. Blank rates mean you prefer to discuss the fee.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">Category / role</label>
            <p className="mb-2 text-xs text-stone-500">Pick up to 3 roles per broad category.</p>
            <HierarchicalPicker
              groups={CATEGORY_PICKER_GROUPS}
              selectedGroupIds={selectedGroups}
              selectedChildIds={selectedSubtypes}
              onGroupToggle={toggleGroup}
              onChildToggle={toggleSubtype}
              maxChildrenPerGroup={3}
              mode="filter"
              groupLabel="Category"
              childLabel="Role"
            />
            {isInstrumentalistSelected && (
              <div className="mt-3 rounded-lg border border-stone-100 p-3">
                <p className="mb-2 text-xs font-medium text-stone-500">Instrument type</p>
                <div className="flex flex-wrap gap-1.5">
                  {INSTRUMENT_TYPES.map((instrument) => (
                    <Badge
                      key={instrument.slug}
                      variant={instrumentTypes.includes(instrument.slug) ? "default" : "outline"}
                      className="cursor-pointer px-2.5 py-1"
                      onClick={() => toggleInstrumentType(instrument.slug)}
                    >
                      {instrument.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div><label htmlFor="influences" className="mb-2 block text-sm font-medium">Influences (comma-separated)</label><Input id="influences" name="influences" defaultValue={initial.influences.join(", ")} placeholder="Artists, movements, styles" /></div>
          <fieldset><legend className="mb-3 text-sm font-medium">Four favorites</legend><p className="mb-3 text-xs text-muted">Artists, albums, films, or works that describe your taste. All optional.</p><div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((index) => <Input key={index} name={`favorite-${index}`} aria-label={`Favorite ${index + 1}`} defaultValue={initial.favorites[index] ?? ""} maxLength={160} placeholder={`Favorite ${index + 1}`} />)}</div></fieldset>
          <fieldset><legend className="mb-3 text-sm font-medium">Quoted fees (EUR)</legend><div className="grid gap-3 sm:grid-cols-3">{([["performanceFee", "Per performance"], ["hourlyFee", "Per hour"], ["dayFee", "Per day"]] as const).map(([key, label]) => <div key={key}><label htmlFor={key} className="mb-2 block text-xs text-muted">{label}</label><Input id={key} name={key} type="number" min={0} max={1000000} step="0.01" defaultValue={initial[key] ?? ""} /></div>)}</div></fieldset>
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label htmlFor="profile-image-url" className="mb-2 block text-sm font-medium">Profile image URL</label><Input id="profile-image-url" type="url" value={profileImage} onChange={(event) => setProfileImage(event.target.value)} /><ProfileArtwork src={profileImage} alt="Profile preview" sizes="80px" className="mt-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-soft text-xs text-brand">Preview</ProfileArtwork></div>
            <div><label htmlFor="banner-image-url" className="mb-2 block text-sm font-medium">Cover image URL</label><Input id="banner-image-url" type="url" value={bannerImage} onChange={(event) => setBannerImage(event.target.value)} /><ProfileArtwork src={bannerImage} alt="Cover preview" sizes="240px" className="mt-3 flex h-20 items-center justify-center rounded-xl bg-brand-soft text-xs text-brand">Cover preview</ProfileArtwork></div>
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save discovery details"}</Button>
          {message && <p role="status" className="text-sm text-muted">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
