import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Timer, CheckCircle2, XCircle, CircleDot, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { evaluateAnswer, completeSession } from "@/lib/ai.functions";
import { Loading, EmptyState, Pill } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/study/$sessionId")({
  head: () => ({ meta: [{ title: "Study session — AI Memory Trainer" }] }),
  component: Study,
});

type Result = Awaited<ReturnType<typeof evaluateAnswer>>;
const CONF = [["guessing", "Guessing"], ["somewhat", "Somewhat confident"], ["very", "Very confident"]] as const;

function Study() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const evalFn = useServerFn(evaluateAnswer);
  const completeFn = useServerFn(completeSession);

  const data = useQuery({
    queryKey: ["session-full", sessionId],
    queryFn: async () => {
      const { data: s, error } = await supabase.from("study_sessions").select("*, topics(id, title)").eq("id", sessionId).single();
      if (error) throw error;
      const { data: qs } = await supabase.from("questions").select("*").in("id", s.question_ids);
      const { data: ans } = await supabase.from("answers").select("question_id").eq("session_id", sessionId);
      const order = new Map(s.question_ids.map((id: string, i: number) => [id, i]));
      return { s, qs: (qs ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)), answered: new Set((ans ?? []).map((a) => a.question_id)) };
    },
    staleTime: Infinity,
  });

  const [idx, setIdx] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [conf, setConf] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const qStart = useRef(Date.now());

  useEffect(() => {
    if (data.data && idx === null) {
      const first = data.data.qs.findIndex((q) => !data.data!.answered.has(q.id));
      setIdx(first === -1 ? data.data.qs.length : first);
    }
  }, [data.data, idx]);

  useEffect(() => {
    qStart.current = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - qStart.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [idx]);

  const q = useMemo(() => (data.data && idx != null ? data.data.qs[idx] : null), [data.data, idx]);

  if (data.isLoading || idx === null) return <Loading label="Loading session" />;
  if (data.error || !data.data) return <EmptyState title="Session not found" action={<Button asChild><Link to="/dashboard">Dashboard</Link></Button>} />;
  const { s, qs } = data.data;
  const topic = s.topics as { id: string; title: string };

  if (s.status === "completed") {
    return <EmptyState title="This session is complete" action={<Button asChild><Link to="/results/$attemptId" params={{ attemptId: s.id }}>View results</Link></Button>} />;
  }

  const finish = async () => {
    setFinishing(true);
    try {
      await completeFn({ data: { sessionId } });
      qc.invalidateQueries();
      navigate({ to: "/results/$attemptId", params: { attemptId: sessionId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't finish session");
      setFinishing(false);
    }
  };

  const submit = async (skipped = false) => {
    if (!q) return;
    if (!skipped && !answer.trim()) return toast.error("Write an answer, or skip");
    setBusy(true);
    try {
      const r = await evalFn({ data: { sessionId, questionId: q.id, answer: skipped ? "" : answer, confidence: skipped ? null : (conf as "very" | null), durationSeconds: Math.floor((Date.now() - qStart.current) / 1000), skipped } });
      setResult(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit answer");
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    setResult(null);
    setAnswer("");
    setConf(null);
    setIdx((i) => (i ?? 0) + 1);
  };

  const done = idx >= qs.length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/learn/$topicId" params={{ topicId: topic.id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> {topic.title}</Link>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" size="sm">Exit session</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Exit this session?</AlertDialogTitle><AlertDialogDescription>Your answers so far are saved. You can resume later from History.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Keep studying</AlertDialogCancel><AlertDialogAction onClick={() => navigate({ to: "/dashboard" })}>Exit</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="mb-2 flex justify-between text-xs text-muted-foreground">
        <span>Question {Math.min(idx + 1, qs.length)} of {qs.length}</span>
        <span className="num flex items-center gap-1"><Timer className="size-3.5" /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
      </div>
      <Progress value={(Math.min(idx + (result ? 1 : 0), qs.length) / qs.length) * 100} className="mb-6 h-1.5" />

      {done ? (
        <div className="card-surface p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <h2 className="mt-4 text-xl font-semibold">All questions answered</h2>
          <p className="mt-1 text-sm text-muted-foreground">Finish to record this session in your Memory Fingerprint.</p>
          <Button className="mt-6" onClick={finish} disabled={finishing}>{finishing ? <><Loader2 className="size-4 animate-spin" /> Analysing…</> : "Finish & see results"}</Button>
        </div>
      ) : q && (
        <div className="card-surface p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap gap-2">
            <Pill tone="brand">{q.question_type.replace("_", " ")}</Pill>
            <Pill>{q.difficulty}</Pill>
            {q.concept_tag && <Pill>{q.concept_tag}</Pill>}
          </div>
          <h2 className="text-lg font-medium leading-relaxed sm:text-xl">{q.question_text}</h2>

          {!result ? (
            <>
              <div className="mt-6">
                {q.question_type === "mcq" && Array.isArray(q.options) ? (
                  <div className="space-y-2" role="radiogroup" aria-label="Options">
                    {(q.options as string[]).map((o) => (
                      <button key={o} type="button" role="radio" aria-checked={answer === o} onClick={() => setAnswer(o)}
                        className={cn("w-full rounded-lg border p-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", answer === o ? "border-brand bg-brand-soft" : "hover:bg-muted/50")}>{o}</button>
                    ))}
                  </div>
                ) : (
                  <Textarea rows={q.question_type === "fill_blank" ? 2 : 5} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer from memory…" aria-label="Your answer" />
                )}
              </div>
              <div className="mt-6">
                <div className="mb-2 text-sm font-medium">How confident are you?</div>
                <div className="flex flex-wrap gap-2">
                  {CONF.map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setConf(v)} aria-pressed={conf === v}
                      className={cn("rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", conf === v ? "border-brand bg-brand-soft text-accent-foreground" : "hover:bg-muted/50")}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={() => submit(true)} disabled={busy}>Skip</Button>
                <Button onClick={() => submit(false)} disabled={busy}>{busy ? <><Loader2 className="size-4 animate-spin" /> Evaluating…</> : "Submit answer"}</Button>
              </div>
            </>
          ) : (
            <Feedback r={result} onNext={next} last={idx === qs.length - 1} />
          )}
        </div>
      )}
    </div>
  );
}

function Feedback({ r, onNext, last }: { r: Result; onNext: () => void; last: boolean }) {
  const map = {
    correct: ["success", "Correct", CheckCircle2],
    partial: ["warning", "Partially correct", CircleDot],
    incorrect: ["danger", "Incorrect", XCircle],
    skipped: ["muted", "Skipped", HelpCircle],
    unable: ["muted", "Unable to evaluate", HelpCircle],
  } as const;
  const [tone, label, Icon] = map[r.status];
  return (
    <div className="mt-6 space-y-4" aria-live="polite">
      <div className={cn("flex items-center gap-2 rounded-lg p-3 text-sm font-medium", tone === "success" && "bg-success-soft text-success", tone === "warning" && "bg-warning-soft text-warning", tone === "danger" && "bg-danger-soft text-destructive", tone === "muted" && "bg-muted text-muted-foreground")}>
        <Icon className="size-4" /> {label}
      </div>
      <p className="text-sm">{r.feedback}</p>
      <div className="rounded-lg border p-4 text-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected answer</div>
        <div className="mt-1">{r.expected}</div>
        {r.explanation && <><div className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Why</div><div className="mt-1 text-muted-foreground">{r.explanation}</div></>}
        {r.concept && <div className="mt-3 text-xs text-muted-foreground">Concept tested: {r.concept}</div>}
      </div>
      {r.nextStep && <p className="text-sm text-muted-foreground"><strong className="text-foreground">Next step:</strong> {r.nextStep}</p>}
      <div className="flex justify-end"><Button onClick={onNext}>{last ? "Finish" : "Next question"}</Button></div>
    </div>
  );
}
