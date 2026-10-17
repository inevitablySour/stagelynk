"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth/auth-layout";
import { RolePicker } from "@/components/auth/role-picker";
import { TermsCheckbox } from "@/components/auth/terms-checkbox";
import type { UserRole } from "@/types";

export function OnboardingRoleForm() {
  const router = useRouter();
  const { update } = useSession();
  const [role, setRole] = useState<UserRole | null>(null);
  const [venueName, setVenueName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role) return;
    if (!acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          venueName: role === "venue" ? venueName : undefined,
          acceptedTerms: true,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Unable to complete setup.");
        return;
      }

      await update();
      router.push(result.redirectTo ?? (role === "venue" ? "/venue" : "/musician"));
      router.refresh();
    } catch {
      setError("Unable to complete setup right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="text-center">
          <CardTitle>One last step</CardTitle>
          <CardDescription>How will you use the platform?</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <RolePicker value={role} onSelect={setRole} />

          {role && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {role === "venue" && (
                <div>
                  <label htmlFor="venueName" className="block text-sm font-medium text-stone-700 mb-1.5">
                    Organisation name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                      id="venueName"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="e.g. The Blue Note, Acme Studios"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}
              <TermsCheckbox
                checked={acceptedTerms}
                onChange={(checked) => {
                  setAcceptedTerms(checked);
                  if (checked) setError(null);
                }}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Setting up..." : "Continue"}
              </Button>
            </form>
          )}

          <p className="pt-2 text-center text-sm text-stone-500">
            Wrong account?{" "}
            <button
              type="button"
              className="font-medium text-olive-600 hover:underline"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign out
            </button>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
