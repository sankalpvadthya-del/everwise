import type { ObsLite, TopicInsight } from "./fingerprint";
import { estimateDecay, type Confidence } from "./memory-engine";

export interface ChartSession {
  id: string; topic_id: string; status: string; completed_at: string | null;
  score: number | null; maximum_score: number | null; session_type: string;
}
export interface ChartAnswer { session_id: string; confidence_level: string | null; evaluation_status: string }

export function retentionData(observations: ObsLite[], topicId: string) {
  const rows = observations.filter(o => o.topic_id === topicId && Number.isFinite(Date.parse(o.observed_at)) && Number.isFinite(Number(o.recall_score)))
    .sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at));
  const model = estimateDecay(rows);
  const first = rows[0];
  return {
    model,
    points: rows.map(o => ({
      time: Date.parse(o.observed_at), score: Number(o.recall_score),
      estimate: model && first ? Math.round(model.r0 * Math.exp(-(Date.parse(o.observed_at) - Date.parse(first.observed_at)) / 86400000 / model.stabilityDays) * 10) / 10 : null,
    })),
  };
}

export function revisionTimeline(sessions: ChartSession[], topicId: string) {
  return sessions.filter(s => s.topic_id === topicId && s.status === "completed" && s.completed_at && s.score !== null && s.maximum_score !== null && s.maximum_score > 0)
    .flatMap(s => {
      const time = Date.parse(s.completed_at ?? "");
      return Number.isFinite(time) ? [{ id: s.id, time, score: Math.round(Number(s.score) / Number(s.maximum_score) * 1000) / 10, type: s.session_type }] : [];
    }).sort((a, b) => a.time - b.time);
}

export function confidenceData(answers: ChartAnswer[], sessions: ChartSession[], topicId: string) {
  const sessionIds = new Set(sessions.filter(s => s.topic_id === topicId && s.status === "completed").map(s => s.id));
  const groups: { confidence: Confidence; label: string; correct: number; partial: number; incorrect: number; total: number }[] = [
    { confidence: "guessing", label: "Guessing", correct: 0, partial: 0, incorrect: 0, total: 0 },
    { confidence: "somewhat", label: "Somewhat sure", correct: 0, partial: 0, incorrect: 0, total: 0 },
    { confidence: "very", label: "Very sure", correct: 0, partial: 0, incorrect: 0, total: 0 },
  ];
  for (const answer of answers) {
    if (!sessionIds.has(answer.session_id)) continue;
    const group = groups.find(g => g.confidence === answer.confidence_level);
    const status = answer.evaluation_status;
    if (!group || (status !== "correct" && status !== "partial" && status !== "incorrect")) continue;
    group[status]++; group.total++;
  }
  return groups;
}

export function radarData(insights: TopicInsight[]) {
  return insights.filter(i => i.latestScore !== null && i.initialScore !== null).slice(0, 6).map((i, index) => ({
    axis: `T${index + 1}`, title: i.topic.title, id: i.topic.id,
    latest: i.latestScore, first: i.initialScore, attempts: i.attempts,
  }));
}