/**
 * Memory Fingerprint Engine — v1 (explainable heuristics).
 *
 * All scoring, scheduling and aggregation here is deterministic. The AI model is
 * only used for language tasks (explanations, question writing, nuanced answer
 * feedback). This module is pure so it runs on both server and client and is
 * unit-tested in src/test/memory-engine.test.ts.
 *
 * Nothing in here is a clinical or neurological measurement. Estimates are
 * conservative and are withheld when there is not enough evidence.
 */

export const ENGINE_VERSION = "mfe-1.0";

export type EvalStatus = "correct" | "partial" | "incorrect" | "skipped" | "unable";
export type Confidence = "guessing" | "somewhat" | "very";

/** Fully correct = 1, partially correct = 0.5, everything else = 0. */
export function pointsFor(status: EvalStatus): 0 | 0.5 | 1 {
  if (status === "correct") return 1;
  if (status === "partial") return 0.5;
  return 0;
}

export interface SessionScore {
  total: number;
  correct: number;
  partial: number;
  incorrect: number;
  skipped: number;
  unable: number;
  points: number;
  maxPoints: number;
  /** 0–100, rounded to one decimal. Questions that could not be evaluated are excluded from the max. */
  percent: number;
}

export function scoreSession(statuses: EvalStatus[]): SessionScore {
  const c = { correct: 0, partial: 0, incorrect: 0, skipped: 0, unable: 0 };
  for (const s of statuses) c[s]++;
  const points = c.correct + c.partial * 0.5;
  const maxPoints = statuses.length - c.unable;
  const percent = maxPoints > 0 ? Math.round((points / maxPoints) * 1000) / 10 : 0;
  return { total: statuses.length, ...c, points, maxPoints, percent };
}

/** Base spaced-repetition ladder in days: 1 → 3 → 7 → 14 (then doubling). */
export const BASE_INTERVALS = [1, 3, 7, 14];

/**
 * Next review interval in days.
 * - successfulReviews: number of prior recalls scoring >= 70%.
 * - Strong recall (>= 85) with high, accurate confidence moves one step further.
 * - Weak recall (< 50) resets to 1 day. Partial recall (50–69) holds the current step.
 */
export function nextIntervalDays(
  successfulReviews: number,
  scorePercent: number,
  confidentAndCorrectRatio = 0,
): number {
  if (scorePercent < 50) return 1;
  let step = successfulReviews;
  if (scorePercent >= 70) step += 1;
  if (scorePercent >= 85 && confidentAndCorrectRatio >= 0.6) step += 1;
  step = Math.max(0, step - 1);
  if (step < BASE_INTERVALS.length) return BASE_INTERVALS[step];
  return 14 * Math.pow(2, step - BASE_INTERVALS.length + 1);
}

export interface Observation {
  observed_at: string;
  recall_score: number;
}

export type RadarStatus = "overdue" | "recommended" | "stable" | "insufficient";

export interface TopicMemory {
  attempts: number;
  latestScore: number | null;
  initialScore: number | null;
  daysSinceLast: number | null;
  successful: number;
  unsuccessful: number;
  trend: "improving" | "declining" | "flat" | "unknown";
  nextReviewDate: Date | null;
  status: RadarStatus;
  reason: string;
}

const DAY = 86_400_000;

export function analyseTopic(obs: Observation[], recurringErrors = 0, now = new Date()): TopicMemory {
  const sorted = [...obs].sort((a, b) => +new Date(a.observed_at) - +new Date(b.observed_at));
  const attempts = sorted.length;
  if (attempts === 0) {
    return {
      attempts, latestScore: null, initialScore: null, daysSinceLast: null, successful: 0, unsuccessful: 0,
      trend: "unknown", nextReviewDate: null, status: "insufficient",
      reason: "No recall sessions recorded yet.",
    };
  }
  const latest = sorted[attempts - 1];
  const latestScore = Number(latest.recall_score);
  const successful = sorted.filter((o) => Number(o.recall_score) >= 70).length;
  const daysSinceLast = Math.floor((+now - +new Date(latest.observed_at)) / DAY);
  let trend: TopicMemory["trend"] = "unknown";
  if (attempts >= 2) {
    const prev = Number(sorted[attempts - 2].recall_score);
    trend = latestScore - prev > 5 ? "improving" : prev - latestScore > 5 ? "declining" : "flat";
  }
  const interval = nextIntervalDays(Math.max(0, successful - (latestScore >= 70 ? 1 : 0)), latestScore);
  const nextReviewDate = new Date(+new Date(latest.observed_at) + interval * DAY);

  let status: RadarStatus;
  let reason: string;
  if (attempts < 2) {
    status = +now > +nextReviewDate ? "overdue" : "insufficient";
    reason = status === "overdue"
      ? `Only one session so far (${latestScore}%) and its first review is due.`
      : `Only one recall session so far — more evidence needed before estimating retention.`;
  } else if (+now > +nextReviewDate) {
    status = "overdue";
    reason = `Last recall ${daysSinceLast} day(s) ago at ${latestScore}%; scheduled review has passed.`;
  } else if (latestScore < 70 || trend === "declining" || recurringErrors >= 2) {
    status = "recommended";
    reason = latestScore < 70
      ? `Most recent recall was ${latestScore}%, below the 70% stability threshold.`
      : trend === "declining"
        ? `Recall dropped compared with the previous attempt.`
        : `${recurringErrors} recurring mistakes on related concepts.`;
  } else {
    status = "stable";
    reason = `Recall was ${latestScore}% in recent attempts.`;
  }
  return {
    attempts, latestScore, initialScore: Number(sorted[0].recall_score), daysSinceLast, successful,
    unsuccessful: attempts - successful, trend, nextReviewDate, status, reason,
  };
}

/** Configurable weights for the revision priority score (0–100). */
export const PRIORITY_WEIGHTS = {
  weakRecall: 0.35,
  recurringMistakes: 0.2,
  timeSinceSuccess: 0.25,
  examDeadline: 0.15,
  poorAfterRevision: 0.05,
};

/**
 * priority = 100 * Σ wᵢ·fᵢ where each factor fᵢ ∈ [0,1]:
 *  weakRecall        = 1 − latestScore/100
 *  recurringMistakes = min(errors, 5)/5
 *  timeSinceSuccess  = min(daysSinceLastSuccess / 14, 1)
 *  examDeadline      = exam within 14 days → 1 − days/14, else 0
 *  poorAfterRevision = 1 if trend is declining
 */
export function revisionPriority(input: {
  latestScore: number | null;
  recurringErrors: number;
  daysSinceLastSuccess: number | null;
  daysToExam: number | null;
  declining: boolean;
}): number {
  const w = PRIORITY_WEIGHTS;
  const f = {
    weakRecall: input.latestScore == null ? 0.5 : 1 - input.latestScore / 100,
    recurringMistakes: Math.min(input.recurringErrors, 5) / 5,
    timeSinceSuccess: input.daysSinceLastSuccess == null ? 1 : Math.min(input.daysSinceLastSuccess / 14, 1),
    examDeadline: input.daysToExam != null && input.daysToExam >= 0 && input.daysToExam <= 14 ? 1 - input.daysToExam / 14 : 0,
    poorAfterRevision: input.declining ? 1 : 0,
  };
  const score =
    w.weakRecall * f.weakRecall + w.recurringMistakes * f.recurringMistakes + w.timeSinceSuccess * f.timeSinceSuccess +
    w.examDeadline * f.examDeadline + w.poorAfterRevision * f.poorAfterRevision;
  return Math.round(score * 100);
}

/**
 * Confidence calibration: share of answers where confidence matched correctness.
 * "very" should be correct, "guessing" should be wrong/partial. Requires >= 5 answers.
 */
export function calibration(rows: { confidence: Confidence | null; status: EvalStatus }[]): number | null {
  const rated = rows.filter((r) => r.confidence && r.status !== "unable" && r.status !== "skipped");
  if (rated.length < 5) return null;
  let matched = 0;
  for (const r of rated) {
    const p = pointsFor(r.status);
    if (r.confidence === "very" && p === 1) matched++;
    else if (r.confidence === "somewhat" && p >= 0.5) matched++;
    else if (r.confidence === "guessing" && p < 1) matched++;
  }
  return Math.round((matched / rated.length) * 100);
}

/**
 * Exponential-decay estimate fitted to observations (needs >= 3 points spanning >= 2 days).
 * Returns null when evidence is insufficient. R(t) = R0 · e^(−t/S).
 */
export function estimateDecay(obs: Observation[]): { r0: number; stabilityDays: number } | null {
  const sorted = [...obs].sort((a, b) => +new Date(a.observed_at) - +new Date(b.observed_at));
  if (sorted.length < 3) return null;
  const t0 = +new Date(sorted[0].observed_at);
  const span = (+new Date(sorted[sorted.length - 1].observed_at) - t0) / DAY;
  if (span < 2) return null;
  const pts = sorted.map((o) => ({ t: (+new Date(o.observed_at) - t0) / DAY, y: Math.log(Math.max(Number(o.recall_score), 1)) }));
  const n = pts.length;
  const mt = pts.reduce((s, p) => s + p.t, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  const num = pts.reduce((s, p) => s + (p.t - mt) * (p.y - my), 0);
  const den = pts.reduce((s, p) => s + (p.t - mt) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const r0 = Math.min(100, Math.exp(my - slope * mt));
  // Non-negative slope means no observed decay; cap stability conservatively.
  const stabilityDays = slope >= -0.001 ? 60 : Math.min(60, -1 / slope);
  return { r0: Math.round(r0), stabilityDays: Math.round(stabilityDays * 10) / 10 };
}
