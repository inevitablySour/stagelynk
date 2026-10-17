import { ArrowRight, Sparkles, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface RolePickerProps {
  value: UserRole | null;
  onSelect: (role: UserRole) => void;
}

export function RolePicker({ value, onSelect }: RolePickerProps) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onSelect("musician")}
        className={cn(
          "flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-olive-300 hover:bg-olive-50/50",
          value === "musician" ? "border-olive-500 bg-olive-50" : "border-stone-200"
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
        onClick={() => onSelect("venue")}
        className={cn(
          "flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-olive-300 hover:bg-olive-50/50",
          value === "venue" ? "border-olive-500 bg-olive-50" : "border-stone-200"
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
  );
}
