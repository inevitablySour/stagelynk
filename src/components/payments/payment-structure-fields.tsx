"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAYMENT_STRUCTURES, PAYMENT_STRUCTURE_HINTS, PAYMENT_STRUCTURE_LABELS, milestonesMatchFee, type MilestoneInput } from "@/lib/payment-structures";
import { formatMoney } from "@/lib/marketplace-fees";
import type { PaymentStructure } from "@prisma/client";

const cardClass = (active: boolean) => `flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${active ? "border-brand bg-brand-soft/60" : "border-line hover:border-line-strong"}`;

/** Venue side: which structures a listing offers, and the deposit share. */
export function OfferedStructuresField({ value, onChange, depositPercent, onDepositPercentChange }: {
  value: PaymentStructure[]; onChange: (next: PaymentStructure[]) => void;
  depositPercent: number; onDepositPercentChange: (next: number) => void;
}) {
  const toggle = (structure: PaymentStructure) => {
    const next = value.includes(structure) ? value.filter((s) => s !== structure) : [...value, structure];
    if (next.length) onChange(next);
  };
  return (
    <fieldset className="rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-medium">Payment structures you offer</legend>
      <p className="mb-3 text-xs text-muted">Offer one or several. If you offer more than one, the artist picks when they apply. If you only offer one, that is what applies.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {PAYMENT_STRUCTURES.map((structure) => (
          <label key={structure} className={cardClass(value.includes(structure))}>
            <input type="checkbox" className="mt-0.5" checked={value.includes(structure)} onChange={() => toggle(structure)} />
            <span><span className="block font-medium">{PAYMENT_STRUCTURE_LABELS[structure]}</span><span className="text-xs text-muted">{PAYMENT_STRUCTURE_HINTS[structure]}</span></span>
          </label>
        ))}
      </div>
      {value.includes("deposit_balance") && (
        <label className="mt-3 flex items-center gap-3 text-sm">Deposit share
          <select value={depositPercent} onChange={(e) => onDepositPercentChange(Number(e.target.value))} className="h-9 rounded-lg border border-line bg-surface px-2">
            {[20, 25, 30, 40, 50].map((p) => <option key={p} value={p}>{p}%</option>)}
          </select>
        </label>
      )}
    </fieldset>
  );
}

export type MilestoneDraft = { label: string; amount: string };

/** Artist side: pick one of the offered structures; milestone details are mandatory when milestone is chosen. */
export function ApplicantPaymentField({ offered, selected, onSelect, fee, milestones, onMilestones, depositPercent }: {
  offered: PaymentStructure[]; selected: PaymentStructure; onSelect: (next: PaymentStructure) => void;
  fee: number; milestones: MilestoneDraft[]; onMilestones: (next: MilestoneDraft[]) => void;
  depositPercent: number;
}) {
  const options = offered.length ? offered : (["full_sum"] as PaymentStructure[]);
  const parsed: MilestoneInput[] = milestones.map((m) => ({ label: m.label.trim(), amount: Number(m.amount) }));
  const total = Math.round(parsed.reduce((sum, m) => sum + (Number.isFinite(m.amount) ? m.amount : 0), 0) * 100) / 100;
  const matches = fee > 0 && parsed.every((m) => m.label && m.amount > 0) && milestonesMatchFee(parsed, fee);
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1.5 text-sm font-medium text-stone-700">How would you like to be paid?</legend>
      {options.length === 1 ? (
        <p className="rounded-xl border border-line bg-surface-strong/40 p-3 text-sm"><span className="font-medium">{PAYMENT_STRUCTURE_LABELS[options[0]]}</span> <span className="text-muted">: the only structure this listing offers. {PAYMENT_STRUCTURE_HINTS[options[0]]}</span></p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((structure) => (
            <label key={structure} className={cardClass(selected === structure)}>
              <input type="radio" name="paymentStructure" className="mt-0.5" checked={selected === structure} onChange={() => onSelect(structure)} />
              <span><span className="block font-medium">{PAYMENT_STRUCTURE_LABELS[structure]}</span><span className="text-xs text-muted">{PAYMENT_STRUCTURE_HINTS[structure]}</span></span>
            </label>
          ))}
        </div>
      )}
      {selected === "deposit_balance" && fee > 0 && <p className="text-xs text-muted">{depositPercent}% ({formatMoney(Math.round(fee * depositPercent) / 100)}) up front, the rest about 48 hours before the event.</p>}
      {selected === "milestone" && (
        <div className="space-y-2 rounded-xl border border-line p-3">
          <p className="text-xs text-muted">Required: split your fee into milestones. The client pays each one when they approve it.</p>
          {milestones.map((m, index) => (
            <div key={index} className="flex gap-2">
              <Input aria-label={`Milestone ${index + 1} name`} placeholder={`Milestone ${index + 1}, e.g. Rough mix`} value={m.label} onChange={(e) => onMilestones(milestones.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)))} />
              <Input aria-label={`Milestone ${index + 1} amount`} className="w-28" type="number" min={0.01} step="0.01" placeholder="EUR" value={m.amount} onChange={(e) => onMilestones(milestones.map((x, i) => (i === index ? { ...x, amount: e.target.value } : x)))} />
              {milestones.length > 2 && <Button type="button" variant="outline" size="sm" aria-label="Remove milestone" onClick={() => onMilestones(milestones.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => onMilestones([...milestones, { label: "", amount: "" }])}><Plus className="mr-1.5 h-4 w-4" />Add milestone</Button>
            <p className={`text-xs ${matches ? "text-emerald-700" : "text-amber-700"}`}>{formatMoney(total)} of {formatMoney(fee)}{matches ? " ✓" : ": milestones must add up to your fee"}</p>
          </div>
        </div>
      )}
    </fieldset>
  );
}

export const emptyMilestones = (): MilestoneDraft[] => [{ label: "", amount: "" }, { label: "", amount: "" }];
