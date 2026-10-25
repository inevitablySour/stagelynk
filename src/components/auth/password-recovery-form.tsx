"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function PasswordRecoveryForm({ mode, token = "", setup = false }: { mode: "request" | "reset"; token?: string; setup?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const isReset = mode === "reset";
  const hasToken = /^[A-Za-z0-9_-]{43}$/.test(token);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    if (isReset && form.get("password") !== form.get("confirmPassword")) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${isReset ? "reset-password" : "forgot-password"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isReset ? { token, password: form.get("password") } : { email: form.get("email") }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message ?? "Unable to complete this request.");
      setMessage(json.message);
      setDone(true);
      if (isReset) window.history.replaceState(null, "", "/reset-password");
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <Card className="rounded-2xl">
    <CardHeader className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">{done ? <CheckCircle2 className="h-6 w-6" /> : isReset ? <LockKeyhole className="h-6 w-6" /> : <Mail className="h-6 w-6" />}</div>
      <CardTitle className="text-2xl">{done ? isReset ? (setup ? "Password set" : "Password updated") : "Check your inbox" : isReset ? (setup ? "Set your password" : "Choose a new password") : "Forgot your password?"}</CardTitle>
      <CardDescription className="pt-2 leading-6">{isReset ? (setup ? "Add a password so you can also sign in with your email. GitHub or Google sign-in keeps working." : "Choose a strong password that you don't use elsewhere.") : "Enter your account email and we'll help you get back in."}</CardDescription>
    </CardHeader>
    <CardContent>
      {done ? <div className="space-y-5"><p role="status" className="rounded-xl border border-brand/20 bg-brand-soft/50 p-4 text-sm leading-6 text-brand">{message}</p><Button className="w-full" asChild><Link href="/login">Return to sign in</Link></Button></div>
        : isReset && !hasToken ? <div className="space-y-5"><p className="text-sm leading-6 text-muted">This reset link is incomplete. Request a new link to continue.</p><Button className="w-full" asChild><Link href="/forgot-password">Request a reset link</Link></Button></div>
          : <form onSubmit={submit} className="space-y-5">
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {isReset ? <><div><label htmlFor="recovery-password" className="mb-2 block text-sm font-medium">New password</label><Input id="recovery-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} placeholder="At least 8 characters" /></div><div><label htmlFor="recovery-confirm" className="mb-2 block text-sm font-medium">Confirm password</label><Input id="recovery-confirm" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></div><p className="text-xs leading-5 text-muted">{setup ? "This link expires after 30 minutes and works once. Setting a password signs you out of other sessions." : "Reset links expire after 30 minutes and work once. Changing your password signs out existing sessions."}</p></>
              : <div><label htmlFor="recovery-email" className="mb-2 block text-sm font-medium">Account email</label><Input id="recovery-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></div>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : isReset ? (setup ? "Save password" : "Save new password") : "Send reset link"}</Button>
            {!isReset && <p className="text-xs leading-5 text-muted">Signed up with Google or GitHub? Sign in that way, then add a password under Settings → Security. Emails come from accounts@indiecentral.eu.</p>}
          </form>}
      {!done && <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"><ArrowLeft className="h-4 w-4" />Back to sign in</Link>}
    </CardContent>
  </Card>;
}
