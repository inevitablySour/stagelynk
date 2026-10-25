"use client";

import { useState } from "react";
import { CircleCheck, KeyRound, Mail, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function PasswordSetup({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function sendLink() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/settings/security/password-setup", { method: "POST" });
      const json = await res.json();
      setResult({ ok: Boolean(json.success), message: json.message ?? "Unable to send the link right now." });
    } catch {
      setResult({ ok: false, message: "Unable to send the link right now." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-strong/50 p-4">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div className="text-sm">
          <p className="font-medium text-ink">You sign in with GitHub or Google</p>
          <p className="mt-1 text-muted">
            Add a password to also sign in with <span className="font-medium text-ink">{email}</span>. For your security, we&apos;ll email you a link to set it, which confirms the request came from you. You can keep using GitHub or Google either way.
          </p>
        </div>
      </div>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {result.ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> : null}{result.message}
        </p>
      )}
      <Button type="button" onClick={sendLink} disabled={busy}>
        <Mail className="h-4 w-4" /> {busy ? "Sending…" : result?.ok ? "Send another link" : "Email me a link to set a password"}
      </Button>
    </div>
  );
}

export function SecurityForm({ hasPassword, email }: { hasPassword: boolean; email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/security", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Unable to change password.");
        return;
      }
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Unable to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-olive-100 text-olive-600">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasPassword ? (
          <PasswordSetup email={email} />
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-stone-700 mb-1.5">Current Password</label>
              <Input id="current-password" type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-stone-700 mb-1.5">New Password</label>
              <Input id="new-password" type="password" placeholder="Min 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-stone-700 mb-1.5">Confirm New Password</label>
              <Input id="confirm-password" type="password" placeholder="Min 8 characters" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && <p className="text-sm text-emerald-600">Password changed. Other sessions have been signed out.</p>}
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
