"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SocialLinks } from "@/types";

export function MusicianSocialForm({ initial }: { initial: SocialLinks }) {
  const [links, setLinks] = useState<SocialLinks>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const update = (key: keyof SocialLinks, value: string) => setLinks((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/musicians/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialLinks: links }),
      });
      const json = await res.json();
      setMessage(json.success ? "Links saved." : json.message ?? "Unable to save links.");
    } catch {
      setMessage("Unable to save links.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Social & Portfolio Links</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Website</label>
          <Input placeholder="https://your-site.com" value={links.website ?? ""} onChange={(e) => update("website", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Instagram</label>
          <Input placeholder="@artistname" value={links.instagram ?? ""} onChange={(e) => update("instagram", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Spotify</label>
          <Input placeholder="Spotify artist URL" value={links.spotify ?? ""} onChange={(e) => update("spotify", e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Apple Music</label>
          <Input placeholder="Apple Music artist URL" value={links.appleMusic ?? ""} onChange={(e) => update("appleMusic", e.target.value)} />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save links"}
          </Button>
          {message && <span className="text-sm text-stone-500">{message}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
