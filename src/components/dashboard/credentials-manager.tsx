"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Credential, CredentialType } from "@/types";

const TYPE_LABELS: Record<CredentialType, string> = {
  degree: "Degree",
  certificate: "Certificate",
  license: "License",
  award: "Award",
};

type DraftCredential = Omit<Credential, "id"> & { id?: string };

export function CredentialsManager({ initial }: { initial: Credential[] }) {
  const [credentials, setCredentials] = useState<DraftCredential[]>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function addCredential() {
    setCredentials((prev) => [...prev, { type: "certificate", title: "", issuer: "", year: undefined }]);
  }

  function updateCredential(index: number, patch: Partial<DraftCredential>) {
    setCredentials((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeCredential(index: number) {
    setCredentials((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/musicians/me/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentials: credentials
            .filter((c) => c.title.trim())
            .map((c) => ({ type: c.type, title: c.title, issuer: c.issuer, year: c.year })),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.message ?? "Unable to save credentials.");
        return;
      }
      setMessage("Saved.");
    } catch {
      setMessage("Unable to save credentials right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Credentials</CardTitle>
        <CardDescription>
          Degrees, certificates, licenses, or awards that help clients judge your experience.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {credentials.map((credential, index) => (
          <div key={credential.id ?? index} className="flex flex-wrap items-end gap-2 rounded-lg border border-stone-100 p-3">
            <div className="w-32">
              <label className="mb-1 block text-xs font-medium text-stone-500">Type</label>
              <select
                value={credential.type}
                onChange={(e) => updateCredential(index, { type: e.target.value as CredentialType })}
                className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-500">Title</label>
              <Input
                placeholder="e.g. Sound Engineering Diploma"
                value={credential.title}
                onChange={(e) => updateCredential(index, { title: e.target.value })}
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <label className="mb-1 block text-xs font-medium text-stone-500">Issued by</label>
              <Input
                placeholder="e.g. Point Blank Music School"
                value={credential.issuer}
                onChange={(e) => updateCredential(index, { issuer: e.target.value })}
              />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-xs font-medium text-stone-500">Year</label>
              <Input
                type="number"
                value={credential.year ?? ""}
                onChange={(e) => updateCredential(index, { year: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => removeCredential(index)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addCredential}>
          <Plus className="mr-2 h-4 w-4" /> Add credential
        </Button>

        <div className="flex items-center gap-3 pt-2">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save credentials"}
          </Button>
          {message && <span className="text-sm text-stone-500">{message}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
