import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Sparkles, Trash2, RefreshCw, Lightbulb, AlertTriangle, ListOrdered, BookMarked } from "lucide-react";
import { topicQ } from "@/lib/queries";
import { explainTopic, generateQuestions, type Explanation } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Loading, EmptyState, Pill } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TYPES = [
  ["mcq", "Multiple choice"], ["short_answer", "Short answer"], ["definition", "Definition"],
  ["conceptual", "Conceptual"], ["application", "Application"], ["fill_blank", "Fill in the blank"],
] as const;

export const Route = createFileRoute("/_authenticated/learn/$topicId")({
  validateSearch: (s: Record<string, unknown>): { explain?: boolean } => ({ ...(s["explain"] === true || s["explain"] === "true" ? { explain: true } : {}) }),
  head: () => ({ meta: [{ title: "Topic — AI Memory Trainer" }] }),
  component: TopicPage,
});

function TopicPage() {
  const { topicId } = Route.useParams();
  const { explain } = Route.useSearch();
  const topic = useQuery(topicQ(topicId));
  const qc = useQueryClient();
  const navigate = useNavigate();
  const explainFn = useServerFn(explainTopic);
  const genFn = useServerFn(generateQuestions);
  const [explaining, setExplaining] = useState(false);
  const [explainErr, setExplainErr] = useState<string | null>(null);
  const [types, setTypes] = useState<string[]>(["mcq", "short_answer", "conceptual"]);
  const [difficulty, setDifficulty] = useState("mixed");
  const [count, setCount] = useState("10");
  const [generating, setGenerating] = useState(false);
  const autoRan = useRef(false);

  const runExplain = async () => {
    setExplaining(true);
    setExplainErr(null);
    try {
      await explainFn({ data: { topicId } });
      await qc.invalidateQueries({ queryKey: ["topic", topicId] });
    } catch (e) {
      setExplainErr(e instanceof Error ? e.message : "Explanation failed");
    } finally {
      setExplaining(false);
    }
  };

  useEffect(() => {
    if (explain && topic.data && !topic.data.explanation && !autoRan.current) {
      autoRan.current = true;
      void runExplain();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explain, topic.data]);

  if (topic.isLoading) return <Loading />;
  if (topic.error || !topic.data) return <EmptyState title="Topic not found" body="It may have been deleted." action={<Button asChild><Link to="/learn">Back to topics</Link></Button>} />;
  const t = topic.data;
  const exp = t.explanation as Explanation | null;
  const meta = t.source_metadata as { file_name?: string } | null;

  const start = async () => {
    if (!types.length) { toast.error("Choose at least one question type"); return; }
    setGenerating(true);
    try {
      const r = await genFn({ data: { topicId, types, difficulty, count: Number(count) } });
      navigate({ to: "/study/$sessionId", params: { sessionId: r.sessionId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't generate questions");
      setGenerating(false);
    }
  };

  const del = async () => {
    const { error } = await supabase.from("topics").delete().eq("id", topicId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
    toast.success("Topic deleted");
    navigate({ to: "/learn" });
  };

  return (
    <div>
      <Link to="/learn" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Topics</Link>
      <PageHeader
        eyebrow={t.subject}
        title={t.title}
        description={t.description ?? undefined}
        actions={
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 className="size-4" /> Delete</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete this topic?</AlertDialogTitle><AlertDialogDescription>All questions, sessions and memory history for this topic will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {meta?.file_name && <Pill tone="brand"><BookMarked className="size-3" /> {meta.file_name}</Pill>}
        {!t.source_text && <Pill>No study material — uses general AI knowledge</Pill>}
        {t.exam_date && <Pill tone="warning">Exam {t.exam_date}</Pill>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section className="card-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="size-4 text-brand" /> Explanation</h2>
            {exp && <Button size="sm" variant="ghost" onClick={runExplain} disabled={explaining}><RefreshCw className="size-4" /> Regenerate</Button>}
          </div>
          {explaining ? (
            <div className="flex items-center gap-3 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Writing your explanation…</div>
          ) : explainErr ? (
            <div className="rounded-lg bg-danger-soft p-4 text-sm text-destructive">{explainErr} <Button size="sm" variant="outline" className="ml-2" onClick={runExplain}>Retry</Button></div>
          ) : !exp ? (
            <div className="py-6 text-sm text-muted-foreground">No explanation yet. <Button size="sm" className="ml-2" onClick={runExplain}>Explain this topic</Button></div>
          ) : (
            <ExplanationView e={exp} />
          )}
        </section>

        <aside className="card-surface h-fit p-6 lg:sticky lg:top-20">
          <h2 className="text-lg font-semibold">Practise with active recall</h2>
          <p className="mt-1 text-sm text-muted-foreground">Generate questions and answer them before seeing the solution.</p>
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium">Question types</legend>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={types.includes(v)} onCheckedChange={(c) => setTypes((p) => (c ? [...p, v] : p.filter((x) => x !== v)))} /> {l}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["easy", "medium", "hard", "mixed"].map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Questions</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["5", "10", "15", "20"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button className="mt-5 w-full" onClick={start} disabled={generating}>
            {generating ? <><Loader2 className="size-4 animate-spin" /> Generating questions…</> : "Start recall session"}
          </Button>
        </aside>
      </div>
    </div>
  );
}

function ExplanationView({ e }: { e: Explanation }) {
  return (
    <div className="space-y-6 text-sm leading-relaxed">
      {e.grounding !== "source" && (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
          {e.grounding === "general" ? "Based on general AI knowledge — not your notes." : "Combines your material with general AI knowledge."}
        </p>
      )}
      <p className="text-base">{e.overview}</p>
      {e.key_concepts.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">Key concepts</h3>
          <ul className="space-y-2">{e.key_concepts.map((k) => <li key={k.name} className="rounded-lg border p-3"><strong>{k.name}.</strong> <span className="text-muted-foreground">{k.detail}</span></li>)}</ul>
        </div>
      )}
      {e.definitions.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">Definitions</h3>
          <dl className="grid gap-2 sm:grid-cols-2">{e.definitions.map((d) => <div key={d.term} className="rounded-lg bg-muted p-3"><dt className="font-medium">{d.term}</dt><dd className="text-muted-foreground">{d.definition}</dd></div>)}</dl>
        </div>
      )}
      {e.steps.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-semibold"><ListOrdered className="size-4" /> Step by step</h3>
          <ol className="list-decimal space-y-1 pl-5">{e.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      )}
      {e.examples.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-semibold"><Lightbulb className="size-4" /> Examples</h3>
          <ul className="list-disc space-y-1 pl-5">{e.examples.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {e.misconceptions.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-warning" /> Common misconceptions</h3>
          <ul className="list-disc space-y-1 pl-5">{e.misconceptions.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      <div className="rounded-lg border-l-4 border-brand bg-brand-soft p-4"><strong>Summary.</strong> {e.summary}</div>
    </div>
  );
}
