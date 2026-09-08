"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Music, Mail, Lock, User, Building2, ArrowRight, ArrowLeft, Sparkles, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/config";
import type { UserRole } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role) return;
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          venueName: role === "venue" ? String(formData.get("venueName") ?? "") : undefined,
          email,
          password,
          role,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Unable to create account.");
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
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
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-bold text-xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-surface">
            <Music className="h-5 w-5" />
          </div>
          <span className="brand-gradient bg-clip-text text-transparent">
            {APP_NAME}
          </span>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>{step === 1 ? "Join StageLynk" : "Create your account"}</CardTitle>
            <CardDescription>
              {step === 1
                ? "How will you use the platform?"
                : `Sign up as a ${role === "musician" ? "creative" : "client"}`}
            </CardDescription>
            {/* Step indicator */}
            <div className="flex justify-center gap-2 pt-3">
              <div className={cn("h-1.5 w-8 rounded-full", step >= 1 ? "bg-olive-600" : "bg-stone-200")} />
              <div className={cn("h-1.5 w-8 rounded-full", step >= 2 ? "bg-olive-600" : "bg-stone-200")} />
            </div>
          </CardHeader>

          <CardContent>
            {step === 1 ? (
              /* ── Step 1: Role selection ── */
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setRole("musician"); setStep(2); }}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-olive-300 hover:bg-olive-50/50",
                    role === "musician" ? "border-olive-500 bg-olive-50" : "border-stone-200"
                  )}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-olive-100 text-olive-600">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900">I&apos;m a Creative</div>
                    <div className="text-sm text-stone-500">
                      Musician, voice actor, animator, actor, DJ — showcase your talent and get booked
                    </div>
                  </div>
                  <ArrowRight className="ml-auto h-5 w-5 text-stone-400" />
                </button>

                <button
                  type="button"
                  onClick={() => { setRole("venue"); setStep(2); }}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-olive-300 hover:bg-olive-50/50",
                    role === "venue" ? "border-olive-500 bg-olive-50" : "border-stone-200"
                  )}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-copper-100 text-copper-600">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900">I&apos;m Hiring</div>
                    <div className="text-sm text-stone-500">
                      Venue, studio, agency, or company — find and book creative talent
                    </div>
                  </div>
                  <ArrowRight className="ml-auto h-5 w-5 text-stone-400" />
                </button>
              </div>
            ) : (
              /* ── Step 2: Account details ── */
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
                      <Input id="password" name="password" type="password" placeholder="Min 8 characters" className="pl-10" required />
                    </div>
                  </div>

                  <div className="text-xs text-stone-500">
                    By signing up you agree to our{" "}
                    <Link href="/terms" className="text-olive-600 hover:underline">Terms of Service</Link> and{" "}
                    <Link href="/privacy" className="text-olive-600 hover:underline">Privacy Policy</Link>.
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
      </div>
    </div>
  );
}
