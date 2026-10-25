"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SocialLinks } from "@/types";
import { LINK_FIELDS, LINK_KEYS, portfolioKindsFor, sectionsFor, type LinkKey } from "@/lib/portfolio-links";

export function MusicianSocialForm({ initial, categoryGroupSlugs = [] }: { initial: SocialLinks; categoryGroupSlugs?: string[] }) {
  const [links, setLinks] = useState<SocialLinks>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sections = sectionsFor(portfolioKindsFor(categoryGroupSlugs));
  const shown = new Set(sections.flatMap((section) => section.keys));
  const extras = LINK_KEYS.filter((key) => !shown.has(key) && links[key]);
  const update = (key: LinkKey, value: string) => setLinks((prev) => ({ ...prev, [key]: value }));

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
      <CardContent className="space-y-6">
        <p className="text-sm text-muted">The links below match the categories you picked. Change your categories above to see the other set.</p>
        {sections.map((section) => (
          <fieldset key={section.title} className="space-y-3">
            <legend className="text-sm font-semibold text-ink">{section.title}</legend>
            <p className="-mt-1 text-xs text-muted">{section.hint}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {section.keys.map((key) => (
                <div key={key}>
                  <label className="mb-1.5 block text-sm font-medium">{LINK_FIELDS[key].label}</label>
                  <Input placeholder={LINK_FIELDS[key].placeholder} value={links[key] ?? ""} onChange={(e) => update(key, e.target.value)} />
                </div>
              ))}
            </div>
          </fieldset>
        ))}
        {extras.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-ink">Other links</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {extras.map((key) => (
                <div key={key}>
                  <label className="mb-1.5 block text-sm font-medium">{LINK_FIELDS[key].label}</label>
                  <Input placeholder={LINK_FIELDS[key].placeholder} value={links[key] ?? ""} onChange={(e) => update(key, e.target.value)} />
                </div>
              ))}
            </div>
          </fieldset>
        )}
        <div className="flex items-center gap-3">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save links"}
          </Button>
          {message && <span className="text-sm text-stone-500">{message}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
