"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AccountInfoForm({ name, email, location }: { name: string; email: string; location: string }) {
  const router = useRouter();
  const [nameValue, setNameValue] = useState(name);
  const [locationValue, setLocationValue] = useState(location);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameValue.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue.trim(), location: locationValue.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to save changes.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-olive-100 text-olive-600">
            <User className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1.5">Full Name</label>
            <Input id="name" value={nameValue} onChange={(e) => setNameValue(e.target.value)} placeholder="Nova Eclipse" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
            <Input id="email" type="email" value={email} disabled className="opacity-60" />
            <p className="mt-1 text-xs text-stone-400">Email changes aren&apos;t supported yet. Contact support if you need this updated.</p>
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-stone-700 mb-1.5">Location</label>
            <Input id="location" value={locationValue} onChange={(e) => setLocationValue(e.target.value)} placeholder="London, UK" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-emerald-600">Saved.</p>}
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
