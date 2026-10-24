"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, CheckCircle2 } from "lucide-react";

const LINK_ERROR_MESSAGES: Record<string, string> = {
  denied: "You cancelled the connection request.",
  already_linked_elsewhere: "That account is already connected to a different IndieCentral account.",
  state_mismatch: "That link request expired or was invalid. Please try again.",
  state_invalid: "That link request expired or was invalid. Please try again.",
  not_configured: "That sign-in provider isn't configured yet.",
  token_exchange_failed: "The provider didn't confirm the connection. Please try again.",
  profile_fetch_failed: "Couldn't read your profile from the provider. Please try again.",
};

const GITHUB_ICON = (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
  </svg>
);

const GOOGLE_ICON = (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

interface ProviderRowProps {
  provider: "github" | "google";
  label: string;
  icon: React.ReactNode;
  linked: boolean;
}

function ProviderRow({ provider, label, icon, linked }: ProviderRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-100 p-3">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-medium text-stone-900">{label}</p>
          <p className="text-xs text-stone-500">{linked ? "Connected" : "Not connected"}</p>
        </div>
      </div>
      {linked ? (
        <span className="flex items-center gap-1 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Connected
        </span>
      ) : (
        <Button size="sm" variant="outline" asChild>
          <a href={`/api/settings/connections/${provider}/start`}>Connect</a>
        </Button>
      )}
    </div>
  );
}

export function ConnectedAccounts({
  isGithubLinked,
  isGoogleLinked,
}: {
  isGithubLinked: boolean;
  isGoogleLinked: boolean;
}) {
  const searchParams = useSearchParams();
  const linkedParam = searchParams.get("linked");
  const errorParam = searchParams.get("linkError");

  const githubLinked = isGithubLinked || linkedParam === "github";
  const googleLinked = isGoogleLinked || linkedParam === "google";

  const message =
    linkedParam === "github" || linkedParam === "google"
      ? { ok: true, text: `${linkedParam === "github" ? "GitHub" : "Google"} account connected.` }
      : errorParam
        ? { ok: false, text: LINK_ERROR_MESSAGES[errorParam] ?? "Unable to connect that account. Please try again." }
        : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-olive-100 text-olive-600">
            <Link2 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>Link other ways to sign in to your account</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>
        )}
        <ProviderRow provider="github" label="GitHub" icon={GITHUB_ICON} linked={githubLinked} />
        <ProviderRow provider="google" label="Google" icon={GOOGLE_ICON} linked={googleLinked} />
      </CardContent>
    </Card>
  );
}
