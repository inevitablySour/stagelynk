import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Clock, ShieldCheck } from "lucide-react";

interface BookingRequestCardProps {
  musicianId: string;
  stageName: string;
  isSignedInVenue: boolean;
}

export function BookingRequestCard({ musicianId, stageName, isSignedInVenue }: BookingRequestCardProps) {
  return (
    <Card id="book" className="scroll-mt-24 overflow-hidden border-brand/30 shadow-[0_16px_45px_-30px_rgba(47,59,29,0.5)]">
      <CardHeader>
        <p className="eyebrow mb-2">Make something happen</p>
        <CardTitle className="break-words text-xl leading-tight">Work with {stageName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted">
          A live set, a new project, a creative idea. Share the details and propose your fee.
        </p>
        <Button className="w-full" asChild>
          <Link href={isSignedInVenue ? `/book/${musicianId}` : "/register"}>Request a booking <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
        </Button>
        <div className="space-y-3 border-t border-line pt-4 text-xs leading-5 text-muted">
          <p className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />The artist has 48 hours to respond.</p>
          <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />A 5% platform fee is added to the agreed artist fee. Review the full breakdown before submitting.</p>
        </div>
        {!isSignedInVenue && <p className="text-xs leading-5 text-muted">Already have a client account? <Link href="/login" className="font-semibold text-brand underline underline-offset-4">Sign in to book</Link>.</p>}
      </CardContent>
    </Card>
  );
}
