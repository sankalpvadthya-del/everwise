import { analyseTopic, calibration, revisionPriority, type Confidence, type EvalStatus, type TopicMemory } from "./memory-engine";

export interface TopicLite { id: string; title: string; subject: string; exam_date: string | null; created_at: string }
export interface ObsLite { topic_id: string; observed_at: string; recall_score: number }
export interface WeakLite { topic_id: string; occurrence_count: number; status: string }

export interface TopicInsight extends TopicMemory { topic: TopicLite; priority: number; recurringErrors: number }

const DAY = 86400000;

export function buildInsights(topics: TopicLite[], obs: ObsLite[], weak: WeakLite[], now = new Date()): TopicInsight[] {
  return topics
    .map((t) => {
      const o = obs.filter((x) => x.topic_id === t.id);
      const recurring = weak.filter((w) => w.topic_id === t.id && w.status === "active" && w.occurrence_count >= 2).length;
      const m = analyseTopic(o, recurring, now);
      const lastSuccess = [...o].reverse().find((x) => Number(x.recall_score) >= 70);
      const daysToExam = t.exam_date ? Math.ceil((+new Date(t.exam_date) - +now) / DAY) : null;
      const priority = revisionPriority({
        latestScore: m.latestScore,
        recurringErrors: recurring,
        daysSinceLastSuccess: lastSuccess ? (+now - +new Date(lastSuccess.observed_at)) / DAY : null,
        daysToExam,
        declining: m.trend === "declining",
      });
      return { ...m, topic: t, priority, recurringErrors: recurring };
    })
    .sort((a, b) => b.priority - a.priority);
}

export function overallCalibration(answers: { confidence_level: string | null; evaluation_status: string }[]) {
  return calibration(answers.map((a) => ({ confidence: a.confidence_level as Confidence | null, status: a.evaluation_status as EvalStatus })));
}
