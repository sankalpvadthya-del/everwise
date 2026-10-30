import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, Plus, Search } from "lucide-react";
import { topicsQ, observationsQ, weakSpotsQ } from "@/lib/queries";
import { buildInsights } from "@/lib/fingerprint";
import { PageHeader, EmptyState, RadarPill, Loading, Pill, scoreTone } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StartRevisionButton } from "@/components/StartRevisionButton";

export const Route = createFileRoute("/_authenticated/learn/")({
  head: () => ({ meta: [{ title: "Topics — AI Memory Trainer" }, { name: "description", content: "All your study topics." }] }),
  component: Topics,
});

function Topics() {
  const topics = useQuery(topicsQ());
  const obs = useQuery(observationsQ());
  const weak = useQuery(weakSpotsQ());
  const [q, setQ] = useState("");
  if (topics.isLoading || obs.isLoading || weak.isLoading) return <Loading />;
  const insights = buildInsights(topics.data ?? [], obs.data ?? [], weak.data ?? []).filter(
    (i) => !q || `${i.topic.title} ${i.topic.subject}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div>
      <PageHeader title="Topics" description="Everything you're learning. Start a recall session from any topic." actions={<Button asChild><Link to="/learn/new"><Plus className="size-4" /> New topic</Link></Button>} />
      {(topics.data ?? []).length === 0 ? (
        <EmptyState icon={<BookOpen className="size-6" />} title="No topics yet" body="Create your first topic to get an explanation and practice questions." action={<Button asChild><Link to="/learn/new">Learn a new topic</Link></Button>} />
      ) : (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search topics" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search topics" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((i) => (
              <div key={i.topic.id} className="card-surface flex flex-col p-5">
                <div className="text-xs text-muted-foreground">{i.topic.subject}</div>
                <Link to="/learn/$topicId" params={{ topicId: i.topic.id }} className="mt-1 font-display font-semibold hover:underline">{i.topic.title}</Link>
                <div className="mt-3 flex flex-wrap gap-2">
                  <RadarPill status={i.status} />
                  {i.latestScore != null && <Pill tone={scoreTone(i.latestScore)}>{i.latestScore}%</Pill>}
                </div>
                <div className="mt-auto flex gap-2 pt-5">
                  <Button asChild size="sm" variant="outline"><Link to="/learn/$topicId" params={{ topicId: i.topic.id }}>Open</Link></Button>
                  <StartRevisionButton topicId={i.topic.id} hasHistory={i.attempts > 0} label="Recall" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
