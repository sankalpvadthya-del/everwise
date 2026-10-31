import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { topicsQ, tasksQ, observationsQ, weakSpotsQ } from "@/lib/queries";
import { buildInsights } from "@/lib/fingerprint";
import { startRevisionSession } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Loading, EmptyState, Pill, RadarPill } from "@/components/ui-bits";
import { StartRevisionButton } from "@/components/StartRevisionButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PlannerView() {
  const topics = useQuery(topicsQ()); const tasks = useQuery(tasksQ()); const qc = useQueryClient();
  const [topicId, setTopicId] = useState(""); const [date, setDate] = useState(""); const [minutes, setMinutes] = useState(15); const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!topicId || !date) { toast.error("Choose a topic and date"); return; }
    setBusy(true);
    try { const { error } = await supabase.from("revision_tasks").insert({ topic_id: topicId, planned_for: date, planned_duration_minutes: minutes, is_manual: true, reason: "Manual revision" }); if (error) throw error; await qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Revision scheduled"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't schedule revision"); } finally { setBusy(false); }
  };
  const update = async (id: string, snooze: boolean) => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const { error } = await supabase.from("revision_tasks").update(snooze ? { planned_for: tomorrow.toISOString().slice(0, 10), status: "pending" } : { status: "skipped" }).eq("id", id);
    if (error) toast.error(error.message); else await qc.invalidateQueries({ queryKey: ["tasks"] });
  };
  if (topics.isLoading || tasks.isLoading) return <Loading />;
  const error = topics.error || tasks.error;
  if (error) return <EmptyState title="Couldn't load planner" body={error.message} />;
  return <div><PageHeader title="Revision Planner" />
    <form className="mb-8 grid items-end gap-4 border-b pb-6 sm:grid-cols-4" onSubmit={e => { e.preventDefault(); void add(); }}>
      <div className="space-y-2"><Label>Topic</Label><Select value={topicId} onValueChange={setTopicId}><SelectTrigger><SelectValue placeholder="Choose topic" /></SelectTrigger><SelectContent>{topics.data?.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="planned-date">Date</Label><Input id="planned-date" type="date" required value={date} onChange={e => setDate(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="planned-minutes">Minutes</Label><Input id="planned-minutes" type="number" min={5} max={240} required value={minutes} onChange={e => setMinutes(Number(e.target.value))} /></div>
      <Button disabled={busy || !topics.data?.length}>{busy ? "Scheduling…" : "Schedule revision"}</Button>
    </form>
    <div className="space-y-3">{tasks.data?.map(t => <article key={t.id} className="card-surface p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{t.topics?.title}</h2><Pill tone={t.status === "completed" ? "success" : "muted"}>{t.status}</Pill></div><p className="my-3 text-sm text-muted-foreground">{t.planned_for} · {t.planned_duration_minutes} min · {t.reason}</p>{t.status === "pending" && <div className="flex flex-wrap gap-2"><StartRevisionButton topicId={t.topic_id} /><Button size="sm" variant="outline" onClick={() => update(t.id, true)}>Tomorrow</Button><Button size="sm" variant="ghost" onClick={() => update(t.id, false)}>Skip</Button></div>}</article>)}</div>
    {!tasks.data?.length && <EmptyState title="No revisions scheduled" />}
  </div>;
}

export function ExamView() {
  const topics = useQuery(topicsQ()); const obs = useQuery(observationsQ()); const weak = useQuery(weakSpotsQ());
  const start = useServerFn(startRevisionSession); const navigate = useNavigate();
  const [subject, setSubject] = useState("all"); const [busy, setBusy] = useState<string | null>(null);
  const run = async (id: string) => {
    setBusy(id);
    try {
      const result = await start({ data: { topicId: id, type: "diagnostic", count: 5 } });
      if (!result.sessionId) { toast.error("Create practice questions for this topic first"); return; }
      sessionStorage.setItem(`amt-exam-${result.sessionId}`, "true");
      await navigate({ to: "/study/$sessionId", params: { sessionId: result.sessionId } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't start exam practice"); } finally { setBusy(null); }
  };
  if (topics.isLoading || obs.isLoading || weak.isLoading) return <Loading />;
  const error = topics.error || obs.error || weak.error;
  if (error) return <EmptyState title="Couldn't load exam preparation" body={error.message} />;
  const insights = buildInsights(topics.data ?? [], obs.data ?? [], weak.data ?? []).filter(i => subject === "all" || i.topic.subject === subject);
  return <div><PageHeader title="Exam-Day Mode" /><div className="mb-6 max-w-xs"><Select value={subject} onValueChange={setSubject}><SelectTrigger aria-label="Exam subject"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All subjects</SelectItem>{[...new Set(topics.data?.map(t => t.subject))].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-3">{insights.map(i => <article key={i.topic.id} className="card-surface p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">{i.topic.title}</h2><RadarPill status={i.status} /></div><p className="mt-2 text-sm text-muted-foreground">{i.topic.subject} · Priority {i.priority}/100{i.topic.exam_date ? ` · Exam ${i.topic.exam_date}` : ""}</p><p className="my-3 text-sm">{i.reason}</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => run(i.topic.id)} disabled={busy !== null}>{busy === i.topic.id ? "Preparing…" : "Quick exam recall"}</Button><Button asChild variant="outline" size="sm"><Link to="/learn/$topicId" params={{ topicId: i.topic.id }}>Review key concepts</Link></Button></div></article>)}</div>
    {!insights.length && <EmptyState title="No topics for this subject" action={<Button asChild><Link to="/learn/new">Add a topic</Link></Button>} />}
  </div>;
}