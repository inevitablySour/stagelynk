// Percentage-based budget tolerance, tiered by price point so a venue's
// search/filter surfaces artists slightly outside a stated range instead of
// hard-excluding them. Upper leeway is deliberately larger than lower
// ("shop up" framing — surface artists worth stretching the budget for).
const LEEWAY_TIERS = [
  { maxBudget: 200, below: 0.1, above: 0.15 },
  { maxBudget: 750, below: 0.12, above: 0.2 },
  { maxBudget: 2500, below: 0.15, above: 0.25 },
  { maxBudget: Infinity, below: 0.18, above: 0.3 },
] as const;

export function leewayForBudget(budget: number) {
  return LEEWAY_TIERS.find((tier) => budget < tier.maxBudget) ?? LEEWAY_TIERS[LEEWAY_TIERS.length - 1];
}

/**
 * Whether `amount` falls within `[min, max]` once the tiered percentage
 * leeway (keyed off `max`) is applied. Also returns the delta so callers can
 * surface an "X% above/below your budget" note rather than silently widening
 * results.
 */
export function withinLeeway(amount: number, min: number, max: number) {
  const { below, above } = leewayForBudget(max);
  const loweredMin = min * (1 - below);
  const raisedMax = max * (1 + above);
  const inRange = amount >= loweredMin && amount <= raisedMax;
  const withinStatedRange = amount >= min && amount <= max;
  let deltaPercent: number | null = null;
  if (!withinStatedRange && inRange) {
    deltaPercent = amount > max ? Math.round(((amount - max) / max) * 100) : Math.round(((min - amount) / min) * 100);
  }
  return { inRange, withinStatedRange, deltaPercent, direction: amount > max ? "above" as const : amount < min ? "below" as const : null };
}
