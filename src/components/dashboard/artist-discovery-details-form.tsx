"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProfileArtwork } from "@/components/artists/profile-artwork";
import { CREATIVE_CATEGORIES } from "@/config";

export interface DiscoveryDetails {
  primaryCategory: string;
  subgenres: string[];
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
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const tags = (key: string) => String(data.get(key) ?? "").split(",").map((tag) => tag.trim()).filter(Boolean);
    const rate = (key: string) => data.get(key) === "" ? null : Number(data.get(key));
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/musicians/me", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryCategory: data.get("primaryCategory"), subgenres: tags("subgenres"), influences: tags("influences"),
          favorites: [0, 1, 2, 3].map((index) => String(data.get(`favorite-${index}`) ?? "").trim()).filter(Boolean),
          performanceFee: rate("performanceFee"), hourlyFee: rate("hourlyFee"), dayFee: rate("dayFee"), profileImage, bannerImage,
        }),
      });
      const json = await response.json();
      setMessage(json.success ? "Discovery details saved." : "Check your category, HTTP(S) image URLs and non-negative rates (up to two decimals).");
      if (json.success) router.refresh();
    } catch { setMessage("Unable to save. Please try again."); }
    finally { setSaving(false); }
  }
  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>Discovery & creative identity</CardTitle><CardDescription>Help clients understand your style and financial fit. Blank rates mean you prefer to discuss the fee.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-5">
          <div><label htmlFor="creative-category" className="mb-2 block text-sm font-medium">Primary craft / role</label><select id="creative-category" name="primaryCategory" defaultValue={initial.primaryCategory.replaceAll("_", "-")} className="h-10 w-full rounded-lg border border-line bg-surface px-3">{CREATIVE_CATEGORIES.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></div>
          {(["subgenres", "influences"] as const).map((key) => <div key={key}><label htmlFor={key} className="mb-2 block text-sm font-medium capitalize">{key} (comma-separated)</label><Input id={key} name={key} defaultValue={initial[key].join(", ")} placeholder={key === "subgenres" ? "Dream pop, neo soul" : "Artists, movements, styles"} /></div>)}
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
