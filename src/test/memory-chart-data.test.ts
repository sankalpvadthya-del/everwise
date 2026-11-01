import { describe, expect, it } from "vitest";
import { confidenceData, radarData, retentionData, revisionTimeline, type ChartSession } from "@/lib/memory-chart-data";
import { buildInsights } from "@/lib/fingerprint";

const session: ChartSession = { id: "review", topic_id: "topic", status: "completed", completed_at: "2026-01-03T12:00:00Z", score: 1.5, maximum_score: 2, session_type: "revision" };
describe("memory chart data", () => {
  it("shows no invented values for a new student", () => {
    expect(retentionData([], "topic")).toEqual({ model: null, points: [] });
    expect(revisionTimeline([], "topic")).toEqual([]);
    expect(confidenceData([], [], "topic").map(g => g.total)).toEqual([0, 0, 0]);
    expect(radarData([])).toEqual([]);
  });
  it("keeps actual observation dates and scores, sorted and topic scoped", () => {
    const data = retentionData([
      { topic_id: "topic", observed_at: "2026-01-03", recall_score: 60 },
      { topic_id: "other", observed_at: "2026-01-02", recall_score: 100 },
      { topic_id: "topic", observed_at: "2026-01-01", recall_score: 90 },
    ], "topic");
    expect(data.points.map(p => [p.time, p.score])).toEqual([[Date.parse("2026-01-01"), 90], [Date.parse("2026-01-03"), 60]]);
    expect(data.model).toBeNull();
    expect(data.points.every(p => p.estimate === null)).toBe(true);
  });
  it("uses the existing decay model only with three observations spanning two days", () => {
    const obs = [90, 80, 70].map((recall_score, index) => ({ topic_id: "topic", observed_at: `2026-01-0${index + 1}`, recall_score }));
    expect(retentionData(obs, "topic").model).not.toBeNull();
    expect(retentionData(obs.map(o => ({ ...o, observed_at: "2026-01-01" })), "topic").model).toBeNull();
  });
  it("plots completed scored reviews at their actual completion time", () => {
    expect(revisionTimeline([session, { ...session, id: "active", status: "in_progress" }, { ...session, id: "unable", maximum_score: 0 }], "topic"))
      .toEqual([{ id: "review", time: Date.parse("2026-01-03T12:00:00Z"), score: 75, type: "revision" }]);
  });
  it("counts rated evaluated outcomes without changing partial credit or including unfinished sessions", () => {
    const answers = ["correct", "partial", "incorrect", "skipped", "unable"].map(evaluation_status => ({ session_id: "review", confidence_level: "very", evaluation_status }));
    const result = confidenceData([...answers, { session_id: "active", confidence_level: "very", evaluation_status: "correct" }], [session], "topic");
    expect(result[2]).toMatchObject({ correct: 1, partial: 1, incorrect: 1, total: 3 });
    expect(confidenceData(answers, [session], "other").map(g => g.total)).toEqual([0, 0, 0]);
  });
  it("uses existing insight scores and excludes unstudied topics from radar axes", () => {
    const topics = ["topic", "new"].map(id => ({ id, title: id, subject: "General", exam_date: null, created_at: "2026-01-01" }));
    const insights = buildInsights(topics, [{ topic_id: "topic", observed_at: "2026-01-01", recall_score: 65 }], [], new Date("2026-01-01"));
    expect(radarData(insights)).toEqual([{ axis: "T1", title: "topic", id: "topic", latest: 65, first: 65, attempts: 1 }]);
  });
});