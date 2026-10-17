import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { TechnicalGap } from "@/types";

export function TechnicalGapAlert({ gaps }: { gaps: TechnicalGap[] }) {
  if (gaps.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        No shortfalls found against the listed technical rider. Confirm the setup before booking.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Technical Gap Alert
      </div>
      <ul className="mt-1.5 ml-6 list-disc space-y-0.5">
        {gaps.map((gap) => (
          <li key={gap.equipmentId}>
            Missing: {gap.shortfall} {gap.name}
            {gap.shortfall > 1 ? "s" : ""}. Artist must supply.
          </li>
        ))}
      </ul>
    </div>
  );
}
