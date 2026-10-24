import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Clock, ShieldCheck } from "lucide-react";
import type { UserRole } from "@/types";

export type BookingCardViewer = { role: UserRole; isOwner: boolean } | null;

export function bookingCardState(viewer: BookingCardViewer) {
  if (!viewer) return "guest";
  if (viewer.isOwner) return "owner";
  if (viewer.role === "venue") return "client";
  return viewer.role === "admin" ? "admin" : "creative";
}

interface BookingRequestCardProps {
  musicianId: string;
  stageName: string;
  viewer: BookingCardViewer;
}

export function BookingRequestCard({ musicianId, stageName, viewer }: BookingRequestCardProps) {
  const state = bookingCardState(viewer);
  const action = state === "client"
    ? { href: `/book/${musicianId}`, label: "Request a booking" }
    : state === "owner"
      ? { href: viewer?.role === "venue" ? "/venue/profile" : "/musician/profile", label: "Manage your profile" }
      : state === "creative"
        ? { href: "/musician/jobs", label: "Browse open calls" }
        : state === "admin"
          ? { href: "/settings", label: "Account settings" }
          : { href: "/login", label: "Sign in to book" };
  const canBookOrSignIn = state === "client" || state === "guest";
  return (
    <Card id="book" data-booking-state={state} className="scroll-mt-24 overflow-hidden border-brand/30 shadow-[0_16px_45px_-30px_rgba(47,59,29,0.5)]">
      <CardHeader>
        <p className="eyebrow mb-2">{state === "owner" ? "Profile preview" : state === "creative" ? "Creative account" : state === "admin" ? "Administrator account" : "Make something happen"}</p>
        <CardTitle className="break-words text-xl leading-tight">{state === "owner" ? "Your public profile" : `Work with ${stageName}`}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted">
          {state === "owner"
            ? "This is how clients see your profile. You cannot book yourself; update your details from your profile editor."
            : state === "creative"
              ? "You're signed in as a creative. Direct booking requests are currently available to venue and client accounts, not creative accounts."
              : state === "admin"
                ? "You're signed in as an administrator. Direct booking requests require a venue or client account."
                : "A live set, a new project, a creative idea. Share the details and propose your fee."}
        </p>
        <Button className="w-full" asChild>
          <Link href={action.href}>{action.label}<ArrowUpRight className="ml-2 h-4 w-4" /></Link>
        </Button>
        {canBookOrSignIn && <div className="space-y-3 border-t border-line pt-4 text-xs leading-5 text-muted">
          <p className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />The artist has 48 hours to respond.</p>
          <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />A 5% platform fee is added to the agreed artist fee. Review the full breakdown before submitting.</p>
        </div>}
        {state === "guest" && <p className="text-xs leading-5 text-muted">New to IndieCentral? <Link href="/register" className="font-semibold text-brand underline underline-offset-4">Create a client account</Link>.</p>}
      </CardContent>
    </Card>
  );
}
