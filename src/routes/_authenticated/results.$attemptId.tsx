import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { scoreSession, calibration, type EvalStatus, type Confidence } from "@/lib/memory-engine";
import { fmtDuration } from "@/lib/queries";
import { PageHeader, Stat, Loading, EmptyState, Pill, scoreTone } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { StartRevisionButton } from "@/components/StartRevisionButton";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { startRevisionSession } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/results/$attemptId")({
  head: () => pageMeta("Results", "Review recall scores, feedback and your next revision."),
  component: Results,
});

const tone = { correct: "success", partial: "warning", incorrect: "danger", skipped: "muted", unable: "muted" } as const;
const label = { correct: "Correct", partial: "Partial", incorrect: "Incorrect", skipped: "Skipped", unable: "Not evaluated" };

function Results() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const startFn = useServerFn(startRevisionSession);
  const q = useQuery({
    queryKey: ["results", attemptId],
    queryFn: async () => {
      const { data: s, error } = await supabase.from("study_sessions").select("*, topics(id, title, subject), revision_tasks(planned_for, status)").eq("id", attemptId).single();
      if (error) throw error;
      const { data: a } = await supabase.from("answers").select("*, questions(question_text, expected_answer, explanation, concept_tag, question_type)").eq("session_id", attemptId).order("answered_at");
      const { data: next } = await supabase.from("revision_tasks").select("planned_for").eq("topic_id", s.topic_id).eq("status", "pending").order("planned_for").limit(1);
      return { s, a: a ?? [], next: next?.[0]?.planned_for ?? null };
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <EmptyState title="Results not found" action={<Button asChild><Link to="/history">History</Link></Button>} />;
  const { s, a, next } = q.data;
  const topic = s.topics as { id: string; title: string; subject: string };
  const sc = scoreSession(a.map((x) => x.evaluation_status as EvalStatus));
  const cal = calibration(a.map((x) => ({ confidence: x.confidence_level as Confidence | null, status: x.evaluation_status as EvalStatus })));
  const missed = a.filter((x) => x.evaluation_status === "incorrect" || x.evaluation_status === "partial" || x.evaluation_status === "skipped");

  const practiseIncorrect = async () => {
    try {
      const r = await startFn({ data: { topicId: topic.id, onlyQuestionIds: missed.map((m) => m.question_id), type: "targeted" } });
      if (r.sessionId) navigate({ to: "/study/$sessionId", params: { sessionId: r.sessionId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start");
    }
  };

  return (
    <div>
      <Link to="/learn/$topicId" params={{ topicId: topic.id }} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> {topic.title}</Link>
      <PageHeader eyebrow={`${topic.subject} · ${format(new Date(s.started_at), "d MMM yyyy, HH:mm")}`} title="Session results" description={s.status !== "completed" ? "This session hasn't been finished yet." : next ? `Next spaced review scheduled for ${format(new Date(next), "EEEE d MMMM")}.` : undefined} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Overall score" value={`${sc.percent}%`} hint={`${sc.points} / ${sc.maxPoints} points`} tone={sc.percent >= 70 ? "success" : sc.percent >= 50 ? "warning" : "danger"} />
        <Stat label="Correct · Partial · Incorrect" value={`${sc.correct} · ${sc.partial} · ${sc.incorrect}`} hint={`${sc.total} questions${sc.skipped ? `, ${sc.skipped} skipped` : ""}`} />
        <Stat label="Time taken" value={fmtDuration(s.duration_seconds)} />
        <Stat label="Confidence accuracy" value={cal != null ? `${cal}%` : "—"} hint={cal != null ? "Confidence matched outcome" : "Needs ≥ 5 rated answers"} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {missed.length > 0 && <Button onClick={practiseIncorrect}>Practise incorrect answers ({missed.length})</Button>}
        <Button asChild variant="outline"><Link to="/learn/$topicId" params={{ topicId: topic.id }}>Review the topic</Link></Button>
        <Button asChild variant="outline"><Link to="/revision-planner">Schedule another revision</Link></Button>
        <Button asChild variant="ghost"><Link to="/dashboard">Return to dashboard</Link></Button>
      </div>
      <h2 className="mb-3 mt-10 text-lg font-semibold">Question review</h2>
      <div className="space-y-3">
        {a.map((x, i) => {
          const qq = x.questions as { question_text: string; expected_answer: string; explanation: string | null; concept_tag: string | null };
          const st = x.evaluation_status as keyof typeof tone;
          return (
            <details key={x.id} className="card-surface group p-5" open={st !== "correct"}>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <span className="text-sm font-medium"><span className="num mr-2 text-muted-foreground">{i + 1}.</span>{qq.question_text}</span>
                <Pill tone={tone[st]}>{label[st]}</Pill>
              </summary>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><div className="text-xs uppercase tracking-wide text-muted-foreground">Your answer</div><div className="mt-1">{x.submitted_answer || <em className="text-muted-foreground">No answer</em>}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-muted-foreground">Expected</div><div className="mt-1">{qq.expected_answer}</div></div>
                {x.evaluation_feedback && <div className="sm:col-span-2"><div className="text-xs uppercase tracking-wide text-muted-foreground">Evaluation</div><div className="mt-1">{x.evaluation_feedback}</div></div>}
                {qq.explanation && <div className="sm:col-span-2 text-muted-foreground">{qq.explanation}</div>}
                <div className="text-xs text-muted-foreground sm:col-span-2">Concept: {qq.concept_tag ?? "—"}{x.confidence_level && ` · Confidence: ${x.confidence_level}`}</div>
              </div>
            </details>
          );
        })}
      </div>
      {a.length === 0 && <EmptyState title="No answers recorded" action={<StartRevisionButton topicId={topic.id} />} />}
      <span className="hidden"><Pill tone={scoreTone(null)}>.</Pill></span>
    </div>
  );
}
