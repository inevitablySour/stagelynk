"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock, User, Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AuthLayout } from "@/components/auth/auth-layout";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { RolePicker } from "@/components/auth/role-picker";
import { TermsCheckbox } from "@/components/auth/terms-checkbox";
import { PasswordStrength } from "@/components/auth/password-strength";
import type { UserRole } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [password, setPassword] = useState("");

  function handleOAuthSignIn() {
    if (!acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return false;
    }
    setError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role) return;
    if (!acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const submittedPassword = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          venueName: role === "venue" ? String(formData.get("venueName") ?? "") : undefined,
          email,
          password: submittedPassword,
          role,
          acceptedTerms: true,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Unable to create account.");
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password: submittedPassword,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
        return;
      }

      router.push(result.redirectTo ?? (role === "venue" ? "/venue" : "/musician"));
      router.refresh();
    } catch {
      setError("Unable to create account right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{step === 1 ? "Join StageLynk" : "Create your account"}</CardTitle>
          <CardDescription>
            {step === 1 ? "How will you use the platform?" : `Sign up as a ${role === "musician" ? "creative" : "client"}`}
          </CardDescription>
          <div className="flex justify-center gap-2 pt-3">
            <div className={cn("h-1.5 w-8 rounded-full", step >= 1 ? "bg-olive-600" : "bg-stone-200")} />
            <div className={cn("h-1.5 w-8 rounded-full", step >= 2 ? "bg-olive-600" : "bg-stone-200")} />
          </div>
        </CardHeader>

        <CardContent>
          {step === 1 ? (
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              <TermsCheckbox
                checked={acceptedTerms}
                onChange={(checked) => {
                  setAcceptedTerms(checked);
                  if (checked) setError(null);
                }}
              />

              <OAuthButtons callbackUrl="/onboarding/role" onBeforeSignIn={handleOAuthSignIn} />

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-surface px-2 text-muted">or choose how you&apos;ll use StageLynk</span>
                </div>
              </div>

              <RolePicker
                value={role}
                onSelect={(selected) => {
                  setRole(selected);
                  setStep(2);
                }}
              />
            </div>
          ) : (
            <>
              <button
                type="button"
                className="mb-4 flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </div>
                )}
                <input type="hidden" name="role" value={role ?? ""} />
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1.5">
                    {role === "musician" ? "Full name or stage name" : "Contact name"}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input id="name" name="name" placeholder={role === "musician" ? "e.g. Nova Eclipse" : "e.g. John Smith"} className="pl-10" required />
                  </div>
                </div>

                {role === "venue" && (
                  <div>
                    <label htmlFor="venueName" className="block text-sm font-medium text-stone-700 mb-1.5">
                      Organisation name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <Input id="venueName" name="venueName" placeholder="e.g. The Blue Note, Acme Studios" className="pl-10" required />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input id="email" name="email" type="email" placeholder="you@example.com" className="pl-10" required />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Min 8 characters"
                      className="pl-10"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-stone-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-olive-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
