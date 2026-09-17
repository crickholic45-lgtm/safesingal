// ==========================================================
// SafeSignal Pattern Detection Engine
//
// Four deterministic rules, run in order. No AI/ML here on
// purpose — every alert this produces can be explained in
// plain arithmetic. See README.md for the full walkthrough.
// ==========================================================

export const ALL_CATEGORIES = [
  'catcalling',
  'loitering',
  'following',
  'indecent_exposure',
  'other',
] as const;

// Categories in this list skip the pattern engine entirely and
// create an immediate alert the moment a single report comes in.
export const IMMEDIATE_CATEGORIES = ['sexual_assault', 'physical_threat'];

export const WINDOW_DAYS = 14;
export const MIN_DISTINCT_REPORTERS = 4;
export const MIN_DISTINCT_DAYS = 2;
export const SCORE_THRESHOLD = 0.15;
export const COOLDOWN_MINUTES = 20;

export type EngineReport = {
  reporter_token: string;
  category: string;
  created_at: string; // ISO timestamp
};

export type ScoreResult = {
  alert: boolean;
  reason?: 'below_floor' | 'below_threshold' | 'no_reports';
  score: number;
  tier: 'none' | 'watch' | 'elevated' | 'urgent';
  distinctReporters: number;
  distinctDays: number;
  distinctCategories: number;
  totalReports: number;
  topCategories: string[];
};

function tierForScore(score: number): ScoreResult['tier'] {
  if (score >= 0.5) return 'urgent';
  if (score >= 0.3) return 'elevated';
  if (score >= SCORE_THRESHOLD) return 'watch';
  return 'none';
}

/**
 * Rule 2 + 3 + 4 combined: aggregate a zone's reports from the
 * trailing window, apply the hard floor, then compute the score.
 *
 * This function is pure (no DB calls) so it's easy to unit test
 * and easy to explain to judges line by line.
 */
export function scoreZone(reports: EngineReport[]): ScoreResult {
  const totalReports = reports.length;

  if (totalReports === 0) {
    return {
      alert: false,
      reason: 'no_reports',
      score: 0,
      tier: 'none',
      distinctReporters: 0,
      distinctDays: 0,
      distinctCategories: 0,
      totalReports: 0,
      topCategories: [],
    };
  }

  const distinctReporters = new Set(reports.map((r) => r.reporter_token)).size;
  const distinctDays = new Set(
    reports.map((r) => new Date(r.created_at).toDateString())
  ).size;
  const categoryCounts = new Map<string, number>();
  for (const r of reports) {
    categoryCounts.set(r.category, (categoryCounts.get(r.category) || 0) + 1);
  }
  const distinctCategories = categoryCounts.size;
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  // Rule 3 — the hard floor. Below this, no alert can ever fire,
  // no matter how many total reports exist. This is what makes a
  // same-day flood mathematically incapable of triggering an alert.
  if (distinctReporters < MIN_DISTINCT_REPORTERS || distinctDays < MIN_DISTINCT_DAYS) {
    return {
      alert: false,
      reason: 'below_floor',
      score: 0,
      tier: 'none',
      distinctReporters,
      distinctDays,
      distinctCategories,
      totalReports,
      topCategories,
    };
  }

  // Rule 4 — the weighted score.
  const reporterDiversity = distinctReporters / totalReports;
  const timeDispersion = Math.min(distinctDays / WINDOW_DAYS, 1);
  const categoryDiversity = distinctCategories / ALL_CATEGORIES.length;
  const volumeCapped = Math.log(totalReports + 1) / Math.log(50);

  const score = volumeCapped * reporterDiversity * timeDispersion * categoryDiversity;

  return {
    alert: score >= SCORE_THRESHOLD,
    reason: score >= SCORE_THRESHOLD ? undefined : 'below_threshold',
    score,
    tier: tierForScore(score),
    distinctReporters,
    distinctDays,
    distinctCategories,
    totalReports,
    topCategories,
  };
}

/**
 * Optional guard: flags a suspicious burst (lots of reports, very
 * few distinct people, very short time span) so it can be surfaced
 * to an admin as "suspicious activity — suppressed" instead of
 * silently vanishing. Separate from the hard floor on purpose —
 * this is about visibility, not about whether an alert fires.
 */
export function detectBurst(reports: EngineReport[]): boolean {
  if (reports.length < 10) return false;
  const distinctReporters = new Set(reports.map((r) => r.reporter_token)).size;
  const timestamps = reports.map((r) => new Date(r.created_at).getTime());
  const spanMinutes = (Math.max(...timestamps) - Math.min(...timestamps)) / 60000;
  return spanMinutes < 30 && distinctReporters <= 3;
}
