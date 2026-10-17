import Link from "next/link";

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function TermsCheckbox({ checked, onChange }: TermsCheckboxProps) {
  return (
    <label className="flex items-start gap-2 text-xs text-stone-500">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded border-stone-300"
      />
      <span>
        I agree to the{" "}
        <Link href="/terms" target="_blank" className="text-olive-600 hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" target="_blank" className="text-olive-600 hover:underline">
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  );
}
