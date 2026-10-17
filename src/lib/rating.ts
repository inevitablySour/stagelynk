/**
 * Converts a plain 1-5 average rating into a weighted /10 score, pulling
 * scores with few reviews toward a neutral midpoint (Bayesian-average style)
 * so one 5-star review doesn't outrank an artist with 50 reviews averaging 4.8.
 *
 * Neutral prior: 3/5 (mid-scale), weighted as if there were `PRIOR_WEIGHT`
 * reviews already at that score.
 */
const PRIOR_SCORE_OUT_OF_5 = 3;
const PRIOR_WEIGHT = 5;

export function computeWeightedRating(averageRating: number, reviewCount: number): number {
  if (reviewCount === 0) return 0;

  const weightedAverage =
    (averageRating * reviewCount + PRIOR_SCORE_OUT_OF_5 * PRIOR_WEIGHT) / (reviewCount + PRIOR_WEIGHT);

  return Math.round((weightedAverage / 5) * 10 * 10) / 10;
}
