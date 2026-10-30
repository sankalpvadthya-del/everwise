import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Upload, Repeat, Stethoscope, Fingerprint, Activity, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { topicsQ, sessionsQ, observationsQ, weakSpotsQ, profileQ, pct, fmtDuration } from "@/lib/queries";
import { buildInsights } from "@/lib/fingerprint";
import { PageHeader, Stat, EmptyState, Pill, scoreTone, RadarPill, Loading } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { StartRevisionButton } from "@/components/StartRevisionButton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AI Memory Trainer" }, { name: "description", content: "Your learning overview." }] }),
  component: Dashboard,
});

function Dashboard() {
  const topics = useQuery(topicsQ());
  const sessions = useQuery(sessionsQ());
  const obs = useQuery(observationsQ());
  const weak = useQuery(weakSpotsQ());
  const profile = useQuery(profileQ());
  if (topics.isLoading || sessions.isLoading || obs.isLoading || weak.isLoading) return <Loading />;
  if (topics.error) return <EmptyState title="Couldn't load your data" body={topics.error.message} />;

  const t = topics.data ?? [];
  const s = sessions.data ?? [];
  const o = obs.data ?? [];
  const insights = buildInsights(t, o, weak.data ?? []);
  const completed = s.filter((x) => x.status === "completed");
  const recent = o.slice(-5);
  const recentAvg = recent.length ? Math.round(recent.reduce((a, b) => a + Number(b.recall_score), 0) / recent.length) : null;
  const stable = insights.filter((i) => i.status === "stable").length;
  const attention = insights.filter((i) => i.status === "overdue" || i.status === "recommended");
  const name = profile.data?.display_name;

  return (
    <div>
      <PageHeader eyebrow={format(new Date(), "EEEE, d MMMM")} title={name ? `Welcome back, ${name}` : "Welcome back"} description="Here's what your Memory Fingerprint says today." />

      {t.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-6" />}
          title="Start your first topic"
          body="Add a topic or upload notes. After your first recall session, your Memory Fingerprint starts forming — no made-up numbers until then."
          action={<Button asChild><Link to="/learn/new">Learn a new topic</Link></Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Recent recall" value={recentAvg != null ? `${recentAvg}%` : "—"} hint={recentAvg != null ? `Average of last ${recent.length} session(s)` : "No sessions yet"} icon={<Activity className="size-4" />} />
            <Stat label="Learning stability" value={`${stable}/${t.length}`} hint="Topics stable in recent attempts" tone="success" icon={<ShieldCheck className="size-4" />} />
            <Stat label="Need attention" value={attention.length} hint="Overdue or recommended" tone="warning" icon={<AlertTriangle className="size-4" />} />
            <Stat label="Sessions completed" value={completed.length} hint="All time" icon={<CheckCircle2 className="size-4" />} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { to: "/learn/new", label: "Learn a new topic", icon: BookOpen },
              { to: "/learn/new", label: "Upload study material", icon: Upload },
              { to: "/learn", label: "Start a recall session", icon: Repeat },
              { to: "/weak-spots", label: "Review weak spots", icon: Stethoscope },
              { to: "/memory-fingerprint", label: "View Memory Fingerprint", icon: Fingerprint },
            ].map((a) => (
              <Link key={a.label} to={a.to} className="card-surface flex items-center gap-3 p-4 text-sm font-medium transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <a.icon className="size-4 text-brand" /> {a.label}
              </Link>
            ))}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recommended revisions</h2>
                <Link to="/revision-planner" className="text-sm text-muted-foreground hover:text-foreground">Planner →</Link>
              </div>
              {insights.length === 0 ? null : (
                <div className="space-y-3">
                  {insights.slice(0, 5).map((i) => (
                    <div key={i.topic.id} className="card-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to="/learn/$topicId" params={{ topicId: i.topic.id }} className="font-medium hover:underline">{i.topic.title}</Link>
                          <RadarPill status={i.status} />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{i.topic.subject} · {i.reason}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {i.daysSinceLast != null ? `Last attempt ${i.daysSinceLast}d ago` : "Not attempted yet"}
                          {i.latestScore != null && ` · Recent ${i.latestScore}%`} · ~{i.attempts === 0 ? 15 : 10} min
                        </div>
                      </div>
                      <StartRevisionButton topicId={i.topic.id} hasHistory={i.attempts > 0} />
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent sessions</h2>
                <Link to="/history" className="text-sm text-muted-foreground hover:text-foreground">History →</Link>
              </div>
              {completed.length === 0 ? (
                <p className="card-surface p-5 text-sm text-muted-foreground">No completed sessions yet.</p>
              ) : (
                <div className="card-surface divide-y">
                  {completed.slice(0, 6).map((x) => {
                    const p = pct(x.score, x.maximum_score);
                    return (
                      <Link key={x.id} to="/results/$attemptId" params={{ attemptId: x.id }} className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-muted/50">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{(x.topics as { title: string } | null)?.title}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(x.started_at), "d MMM")} · {x.total_questions} Q · {fmtDuration(x.duration_seconds)}</div>
                        </div>
                        <div className="flex items-center gap-2"><Pill tone={scoreTone(p)}>{p ?? "—"}%</Pill><ArrowRight className="size-4 text-muted-foreground" /></div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
