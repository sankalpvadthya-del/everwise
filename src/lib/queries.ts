import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export const topicsQ = () =>
  queryOptions({
    queryKey: ["topics"],
    queryFn: () => unwrap(supabase.from("topics").select("id, title, subject, description, created_at, exam_date").order("created_at", { ascending: false })),
  });

export const topicQ = (id: string) =>
  queryOptions({ queryKey: ["topic", id], queryFn: () => unwrap(supabase.from("topics").select("*").eq("id", id).single()) });

export const sessionsQ = () =>
  queryOptions({
    queryKey: ["sessions"],
    queryFn: () =>
      unwrap(
        supabase
          .from("study_sessions")
          .select("id, topic_id, session_type, status, started_at, completed_at, duration_seconds, total_questions, score, maximum_score, topics(title, subject)")
          .order("started_at", { ascending: false })
          .limit(500),
      ),
  });

export const observationsQ = () =>
  queryOptions({
    queryKey: ["observations"],
    queryFn: () => unwrap(supabase.from("memory_observations").select("id, topic_id, session_id, observed_at, recall_score, confidence_summary").order("observed_at")),
  });

export const answersQ = () =>
  queryOptions({
    queryKey: ["answers"],
    queryFn: () => unwrap(supabase.from("answers").select("id, session_id, evaluation_status, confidence_level, answered_at").limit(2000)),
  });

export const weakSpotsQ = () =>
  queryOptions({
    queryKey: ["weak_spots"],
    queryFn: () => unwrap(supabase.from("weak_spots").select("*, topics(title, subject)").order("occurrence_count", { ascending: false })),
  });

export const tasksQ = () =>
  queryOptions({
    queryKey: ["tasks"],
    queryFn: () => unwrap(supabase.from("revision_tasks").select("*, topics(title, subject), study_sessions(score, maximum_score)").order("planned_for")),
  });

export const profileQ = () =>
  queryOptions({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      return unwrap(supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle());
    },
  });

export function pct(score: number | null | undefined, max: number | null | undefined) {
  if (score == null || !max) return null;
  return Math.round((Number(score) / Number(max)) * 100);
}

export function fmtDuration(s: number | null | undefined) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
}
