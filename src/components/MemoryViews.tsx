import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { topicsQ, observationsQ, weakSpotsQ, answersQ, sessionsQ, pct, fmtDuration } from "@/lib/queries";
import { buildInsights, overallCalibration } from "@/lib/fingerprint";
import { diagnoseTopic } from "@/lib/ai.functions";
import { PageHeader, Loading, EmptyState, Stat, RadarPill, Pill, scoreTone } from "@/components/ui-bits";
import { StartRevisionButton } from "@/components/StartRevisionButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FingerprintCharts, TopicRadarChart } from "@/components/MemoryCharts";

export function MemoryView({ radar = false }: { radar?: boolean }) {
  const topics = useQuery(topicsQ()); const obs = useQuery(observationsQ());
  const weak = useQuery(weakSpotsQ()); const answers = useQuery(answersQ());
  const sessions = useQuery(sessionsQ());
  const [filter, setFilter] = useState("all");
  if (topics.isLoading || obs.isLoading || weak.isLoading || answers.isLoading || sessions.isLoading) return <Loading />;
  const error = topics.error || obs.error || weak.error || answers.error || sessions.error;
  if (error) return <EmptyState title="Couldn't load memory data" body={error.message} />;
  const insights = buildInsights(topics.data ?? [], obs.data ?? [], weak.data ?? []);
  const calibration = overallCalibration(answers.data ?? []);
  return <div>
    <PageHeader title={radar ? "Forgetting Radar" : "Memory Fingerprint"} />
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat label="Recorded recalls" value={obs.data?.length ?? 0} />
      <Stat label="Stable topics" value={insights.filter(i => i.status === "stable").length} tone="success" />
      <Stat label="Confidence accuracy" value={calibration === null ? "—" : `${calibration}%`} hint={calibration === null ? "Needs 5 rated answers" : "Based on recorded answers"} />
    </div>
    {radar && <div className="my-6 flex flex-wrap gap-2">{["all", "overdue", "recommended", "stable", "insufficient"].map(value => <Button key={value} variant={filter === value ? "default" : "outline"} size="sm" onClick={() => setFilter(value)} className="capitalize">{value}</Button>)}</div>}
    {radar ? <TopicRadarChart insights={insights.filter(i => filter === "all" || i.status === filter)} /> : <FingerprintCharts topics={topics.data ?? []} observations={obs.data ?? []} sessions={sessions.data ?? []} answers={answers.data ?? []} />}
    <div className="mt-6 space-y-3">{insights.filter(i => filter === "all" || i.status === filter).map(i => <article key={i.topic.id} className="card-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/learn/$topicId" params={{ topicId: i.topic.id }} className="font-semibold hover:underline">{i.topic.title}</Link><RadarPill status={i.status} /></div>
      <p className="mt-2 text-sm text-muted-foreground">{i.reason}</p>
      <dl className="my-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div><dt className="text-muted-foreground">First recall</dt><dd>{i.initialScore === null ? "—" : `${i.initialScore}%`}</dd></div>
        <div><dt className="text-muted-foreground">Latest recall</dt><dd>{i.latestScore === null ? "—" : `${i.latestScore}%`}</dd></div>
        <div><dt className="text-muted-foreground">Trend · attempts</dt><dd className="capitalize">{i.trend} · {i.attempts}</dd></div>
        <div><dt className="text-muted-foreground">Next review</dt><dd>{i.nextReviewDate?.toLocaleDateString() ?? "Not scheduled"}</dd></div>
      </dl>
      <StartRevisionButton topicId={i.topic.id} hasHistory={i.attempts > 0} label="Recall" />
    </article>)}</div>
    {!insights.length && <EmptyState title="No recall evidence yet" action={<Button asChild><Link to="/learn/new">Add a topic</Link></Button>} />}
    {insights.length > 0 && !insights.some(i => filter === "all" || i.status === filter) && <EmptyState title="No topics in this group" />}
  </div>;
}

export function WeakSpotsView() {
  const weak = useQuery(weakSpotsQ());
  const diagnose = useServerFn(diagnoseTopic);
  const [busy, setBusy] = useState<string | null>(null);
  const [diagnoses, setDiagnoses] = useState<Record<string, Awaited<ReturnType<typeof diagnoseTopic>>>>({});
  const [showAll, setShowAll] = useState(false);
  const run = async (id: string) => {
    setBusy(id);
    try { const result = await diagnose({ data: { topicId: id } }); setDiagnoses(p => ({ ...p, [id]: result })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Diagnosis failed"); }
    finally { setBusy(null); }
  };
  if (weak.isLoading) return <Loading />;
  if (weak.error) return <EmptyState title="Couldn't load weak spots" body={weak.error.message} />;
  const rows = (weak.data ?? []).filter(w => showAll || w.status === "active");
  return <div><PageHeader title="Weak Spots" actions={<Button variant="outline" onClick={() => setShowAll(!showAll)}>{showAll ? "Active only" : "Include improving & resolved"}</Button>} />
    <div className="space-y-3">{rows.map(w => <article key={w.id} className="card-surface p-5">
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{w.concept_tag}</h2><Link to="/learn/$topicId" params={{ topicId: w.topic_id }} className="text-sm text-muted-foreground hover:underline">{w.topics?.title}</Link></div><Pill tone={w.status === "active" ? "warning" : "success"}>{w.status} · {w.occurrence_count} misses</Pill></div>
      <p className="my-3 text-sm text-muted-foreground">{w.evidence_summary}</p>
      <div className="flex flex-wrap gap-2"><StartRevisionButton topicId={w.topic_id} focusConcepts={[w.concept_tag]} label="Targeted practice" /><Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run(w.topic_id)}>{busy === w.topic_id ? "Analysing…" : "Diagnose mistakes"}</Button></div>
      {diagnoses[w.topic_id]?.diagnoses.map((d, i) => <div key={i} className="mt-4 border-t pt-3 text-sm"><h3 className="font-medium">{d.concept} · {d.category}</h3><p className="mt-1">{d.explanation}</p><p className="mt-2 text-muted-foreground">{d.corrective_action}</p></div>)}
    </article>)}</div>{!rows.length && <EmptyState title="No active weak spots" action={<Button asChild><Link to="/learn">Practise a topic</Link></Button>} />}
  </div>;
}

export function HistoryView() {
  const sessions = useQuery(sessionsQ()); const [search, setSearch] = useState(""); const [status, setStatus] = useState("all");
  if (sessions.isLoading) return <Loading />;
  if (sessions.error) return <EmptyState title="Couldn't load history" body={sessions.error.message} />;
  const rows = (sessions.data ?? []).filter(s => (status === "all" || s.status === status) && (s.topics?.title ?? "").toLowerCase().includes(search.toLowerCase()));
  return <div><PageHeader title="Session History" /><div className="mb-6 flex flex-wrap gap-2"><Input className="max-w-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sessions" aria-label="Search sessions" />{["all", "in_progress", "completed"].map(v => <Button key={v} variant={v === status ? "default" : "outline"} onClick={() => setStatus(v)}>{v === "in_progress" ? "In progress" : v === "completed" ? "Completed" : "All"}</Button>)}</div>
    <div className="space-y-3">{rows.map(s => <article key={s.id} className="card-surface flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-medium">{s.topics?.title ?? "Topic"}</h2><p className="mt-1 text-xs text-muted-foreground">{new Date(s.started_at).toLocaleString()} · {s.session_type} · {s.total_questions} questions · {fmtDuration(s.duration_seconds)}</p></div><div className="flex items-center gap-3"><Pill tone={scoreTone(pct(s.score, s.maximum_score))}>{s.status === "completed" ? `${pct(s.score, s.maximum_score) ?? "—"}%` : s.status.replaceAll("_", " ")}</Pill><Button asChild size="sm" variant="outline">{s.status === "in_progress" ? <Link to="/study/$sessionId" params={{ sessionId: s.id }}>Resume</Link> : <Link to="/results/$attemptId" params={{ attemptId: s.id }}>Results</Link>}</Button></div></article>)}</div>
    {!rows.length && <EmptyState title="No matching sessions" action={<Button asChild><Link to="/learn">Start recall</Link></Button>} />}
  </div>;
}