import { describe, it, expect } from "vitest";
import { pointsFor, scoreSession, nextIntervalDays, analyseTopic, calibration, revisionPriority, estimateDecay } from "@/lib/memory-engine";

describe("scoring", () => {
  it("awards 1 / 0.5 / 0 points", () => {
    expect(pointsFor("correct")).toBe(1);
    expect(pointsFor("partial")).toBe(0.5);
    expect(pointsFor("incorrect")).toBe(0);
  });
  it("excludes unevaluable answers from the maximum", () => {
    const s = scoreSession(["correct", "partial", "incorrect", "unable"]);
    expect(s.points).toBe(1.5);
    expect(s.maxPoints).toBe(3);
    expect(s.percent).toBe(50);
  });
});

describe("spaced repetition ladder", () => {
  it("follows 1 → 3 → 7 → 14 days on good recall", () => {
    expect(nextIntervalDays(0, 75)).toBe(1);
    expect(nextIntervalDays(1, 75)).toBe(3);
    expect(nextIntervalDays(2, 75)).toBe(7);
    expect(nextIntervalDays(3, 75)).toBe(14);
  });
  it("resets to 1 day on weak recall", () => {
    expect(nextIntervalDays(3, 40)).toBe(1);
  });
});

describe("radar", () => {
  it("marks a single attempt as insufficient history before its review is due", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(analyseTopic([{ observed_at: "2026-01-01T10:00:00Z", recall_score: 80 }], 0, now).status).toBe("insufficient");
  });
  it("marks topic overdue after review date passes", () => {
    const now = new Date("2026-01-20T00:00:00Z");
    const r = analyseTopic([
      { observed_at: "2026-01-01T00:00:00Z", recall_score: 80 },
      { observed_at: "2026-01-02T00:00:00Z", recall_score: 85 },
    ], 0, now);
    expect(r.status).toBe("overdue");
  });
});

describe("calibration and priority", () => {
  it("needs at least five rated answers", () => {
    expect(calibration([{ confidence: "very", status: "correct" }])).toBeNull();
  });
  it("weights weak recall highest", () => {
    const weak = revisionPriority({ latestScore: 20, recurringErrors: 0, daysSinceLastSuccess: 0, daysToExam: null, declining: false });
    const strong = revisionPriority({ latestScore: 95, recurringErrors: 0, daysSinceLastSuccess: 0, daysToExam: null, declining: false });
    expect(weak).toBeGreaterThan(strong);
  });
  it("withholds decay estimate with fewer than 3 observations", () => {
    expect(estimateDecay([{ observed_at: "2026-01-01", recall_score: 90 }])).toBeNull();
  });
});
