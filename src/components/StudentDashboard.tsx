import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { profileQ, sessionsQ, tasksQ } from "@/lib/queries";
import { academicDraft, dailyStudyProgress } from "@/lib/student-profile";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { StartRevisionButton } from "./StartRevisionButton";

export function StudentDashboard() {
  const profile = useQuery(profileQ()); const sessions = useQuery(sessionsQ()); const tasks = useQuery(tasksQ());
  if (profile.isLoading || sessions.isLoading || tasks.isLoading) return <p className="mb-6 text-sm text-muted-foreground" aria-busy="true">Loading your study plan…</p>;
  if (profile.error || sessions.error || tasks.error) return <p role="alert" className="mb-6 text-sm text-destructive">Your study plan couldn't load. Refresh to try again.</p>;
  const academic = academicDraft(profile.data);
  const progress = dailyStudyProgress(sessions.data ?? [], academic.daily);
  const now = new Date(); const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const due = (tasks.data ?? []).filter(t => t.status === "pending" && t.planned_for <= today).slice(0, 4);
  return <div className="mb-8 space-y-6">
    <section className="grid gap-6 border-y py-6 lg:grid-cols-[1fr_18rem]">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><GraduationCap className="size-5 text-brand" /><h2 className="font-display font-semibold">{academic.level || "Your academic profile"}{academic.board && ` · ${academic.board}`}</h2><Button asChild size="sm" variant="ghost"><Link to="/profile">Edit profile</Link></Button></div>
        <p className="mt-1 text-sm text-muted-foreground">{academic.year || "Academic year not set"}{academic.language && academic.language !== "Not applicable" && ` · Second language: ${academic.language}`}</p>
        <div className="mt-3 flex flex-wrap gap-2">{academic.subjects.length ? academic.subjects.map(s => <span key={s} className="max-w-full break-words rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">{s}</span>) : <p className="text-sm text-muted-foreground">No subjects selected yet.</p>}</div>
      </div>
      <div><div className="flex items-center justify-between gap-2 text-sm"><h2 className="font-medium">Today's study goal</h2><span className="num">{progress.minutes} / {academic.daily} min</span></div><Progress value={progress.percent} aria-label="Daily study progress" className="my-3" /><p className="text-xs text-muted-foreground">Recorded completed-session time today, in your local day. In-progress sessions are not counted.</p></div>
    </section>
    <section><div className="mb-3 flex items-center justify-between"><h2 className="font-display font-semibold">Due in your revision plan</h2><Button asChild size="sm" variant="ghost"><Link to="/revision-planner">View plan</Link></Button></div>{due.length ? <div className="divide-y">{due.map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-medium break-words">{t.topics?.title ?? "Topic"}</p><p className="mt-1 text-xs text-muted-foreground">{t.planned_for} · {t.planned_duration_minutes} min · {t.reason}</p></div><StartRevisionButton topicId={t.topic_id} /></div>)}</div> : <p className="text-sm text-muted-foreground">No pending revisions due today.</p>}</section>
  </div>;
}