import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegendContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { confidenceData, radarData, retentionData, revisionTimeline, type ChartAnswer, type ChartSession } from "@/lib/memory-chart-data";
import type { ObsLite, TopicInsight, TopicLite } from "@/lib/fingerprint";

const config = {
  score: { label: "Recorded recall", color: "var(--chart-1)" },
  estimate: { label: "Fitted estimate", color: "var(--chart-5)" },
  correct: { label: "Correct", color: "var(--success)" },
  partial: { label: "Partial", color: "var(--warning)" },
  incorrect: { label: "Incorrect", color: "var(--destructive)" },
  latest: { label: "Latest recall", color: "var(--chart-1)" },
  first: { label: "First recall", color: "var(--chart-2)" },
};
const dateLabel = (value: number) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const percentLabel = (value: number) => `${value}%`;
const axis = { stroke: "var(--muted-foreground)", tickLine: false, axisLine: false, tick: { fontSize: 11 } };

function PlotSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <section className="min-w-0 border-t pt-6"><h2 className="font-display text-lg font-semibold">{title}</h2>{note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}<div className="mt-4">{children}</div></section>;
}
function NoChart({ children }: { children: ReactNode }) {
  return <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">{children}</div>;
}
interface TooltipRow { name?: string | number; value?: string | number; payload?: { time?: number; title?: string; label?: string; total?: number; type?: string; attempts?: number } }
function MemoryTooltip({ active, payload, unit = "%" }: { active?: boolean; payload?: readonly TooltipRow[]; unit?: string }) {
  const row = payload?.[0]?.payload;
  if (!active || !payload?.length || !row) return null;
  return <div className="max-w-64 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-soft">
    <p className="mb-2 font-medium break-words">{row.title ?? row.label ?? (row.time ? new Date(row.time).toLocaleString() : "Recall")}</p>
    {payload.map((item, index) => <p key={index} className="flex justify-between gap-4"><span>{item.name}</span><span className="num">{item.value}{unit}</span></p>)}
    {row.type && <p className="mt-2 capitalize text-muted-foreground">{row.type.replaceAll("_", " ")}</p>}
    {row.total !== undefined && <p className="mt-2 text-muted-foreground">{row.total} rated answers</p>}
    {row.attempts !== undefined && <p className="mt-2 text-muted-foreground">{row.attempts} recorded recalls</p>}
  </div>;
}

export function FingerprintCharts({ topics, observations, sessions, answers }: { topics: TopicLite[]; observations: ObsLite[]; sessions: ChartSession[]; answers: ChartAnswer[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const topicId = topics.find(t => t.id === selected)?.id ?? topics.find(t => observations.some(o => o.topic_id === t.id))?.id ?? topics[0]?.id ?? "";
  const retention = retentionData(observations, topicId);
  const timeline = revisionTimeline(sessions, topicId);
  const confidence = confidenceData(answers, sessions, topicId);
  const rated = confidence.reduce((total, row) => total + row.total, 0);
  const hasTrend = retention.points.length >= 2 && new Set(retention.points.map(p => p.time)).size >= 2;
  return <div className="my-8 space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">Your recall evidence</h2>
      <Select value={topicId || undefined} onValueChange={setSelected} disabled={!topics.length}><SelectTrigger className="w-full sm:w-72" aria-label="Chart topic"><SelectValue placeholder="No topics yet" /></SelectTrigger><SelectContent>{topics.map(t => <SelectItem value={t.id} key={t.id}>{t.title}</SelectItem>)}</SelectContent></Select>
    </div>
    <PlotSection title="Retention & forgetting curve" note="Recorded recall scores over time. Reviews can improve recall; this is not a direct measurement of forgetting.">
      {retention.points.length ? <>
        <ChartContainer config={config} className="h-72 w-full aspect-auto" aria-label="Retention curve">
          <LineChart accessibilityLayer data={retention.points} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" /><XAxis {...axis} dataKey="time" type="number" domain={["dataMin", "dataMax"]} tickFormatter={dateLabel} minTickGap={40} padding={{ left: 15, right: 15 }} /><YAxis {...axis} domain={[0, 100]} tickFormatter={percentLabel} width={48} />
            <Tooltip content={<MemoryTooltip />} /><Legend content={<ChartLegendContent className="flex-wrap" />} />
            <Line dataKey="score" name="Recorded recall" type="linear" stroke="var(--color-score)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-score)" }} activeDot={{ r: 6 }} isAnimationActive={false} />
            {retention.model && <Line dataKey="estimate" name="Fitted estimate" type="monotone" stroke="var(--color-estimate)" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />}
          </LineChart>
        </ChartContainer>
        {!hasTrend && <p className="mt-2 text-sm text-muted-foreground">One recall date is not enough to show a trend. Complete another recall on a later date.</p>}
        <p className="mt-2 text-xs text-muted-foreground">{retention.model ? "Dashed line: the existing engine’s fitted estimate, limited to the observed date range; not a prediction or clinical measure." : "A fitted forgetting estimate needs at least 3 recalls spanning 2 days. Recorded results are shown without an estimate."}</p>
      </> : <NoChart>No recall observations for this topic yet. Complete a recall to record your first score.</NoChart>}
    </PlotSection>
    <div className="grid min-w-0 gap-8 xl:grid-cols-2">
      <PlotSection title="Revision timeline" note="Completed sessions at their actual completion dates.">
        {timeline.length ? <><ChartContainer config={config} className="h-72 w-full aspect-auto" aria-label="Revision timeline"><LineChart accessibilityLayer data={timeline} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" /><XAxis {...axis} dataKey="time" type="number" domain={["dataMin", "dataMax"]} tickFormatter={dateLabel} minTickGap={40} padding={{ left: 15, right: 15 }} /><YAxis {...axis} width={48} domain={[0, 100]} tickFormatter={percentLabel} /><Tooltip content={<MemoryTooltip />} /><Legend content={<ChartLegendContent />} />
          <Line dataKey="score" name="Recorded recall" stroke="var(--color-score)" strokeWidth={0} dot={{ r: 5, fill: "var(--color-score)" }} activeDot={{ r: 7 }} isAnimationActive={false} />
        </LineChart></ChartContainer>
        <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">Review dates & scores ({timeline.length})</summary><div className="mt-2 max-h-56 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="py-2">Completed</th><th>Session</th><th className="text-right">Score</th></tr></thead><tbody>{timeline.map(row => <tr key={row.id} className="border-t"><td className="py-2">{new Date(row.time).toLocaleString()}</td><td className="capitalize">{row.type.replaceAll("_", " ")}</td><td className="num text-right">{row.score}%</td></tr>)}</tbody></table></div></details>
        </> : <NoChart>No completed, scored reviews yet. In-progress and unevaluable sessions are not plotted.</NoChart>}
      </PlotSection>
      <PlotSection title="Confidence vs correctness" note="Actual answer counts, grouped by your confidence rating.">
        {rated ? <><ChartContainer config={config} className="h-72 w-full aspect-auto" aria-label="Confidence versus correctness"><BarChart accessibilityLayer data={confidence} margin={{ top: 12, right: 8, left: 0, bottom: 12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" /><XAxis {...axis} dataKey="label" interval={0} /><YAxis {...axis} allowDecimals={false} width={32} /><Tooltip content={<MemoryTooltip unit="" />} cursor={{ fill: "var(--muted)" }} /><Legend content={<ChartLegendContent className="flex-wrap" />} />
          <Bar dataKey="correct" name="Correct" stackId="outcomes" fill="var(--color-correct)" maxBarSize={48} isAnimationActive={false} /><Bar dataKey="partial" name="Partial" stackId="outcomes" fill="var(--color-partial)" maxBarSize={48} isAnimationActive={false} /><Bar dataKey="incorrect" name="Incorrect" stackId="outcomes" fill="var(--color-incorrect)" maxBarSize={48} isAnimationActive={false} />
        </BarChart></ChartContainer><p className="mt-2 text-xs text-muted-foreground">{rated} rated, evaluated answers in completed sessions. Skipped, unevaluable and unrated answers excluded.{rated < 5 && " Fewer than 5 rated answers: not enough evidence for confidence calibration."}</p></> : <NoChart>No rated answers in completed sessions for this topic yet.</NoChart>}
      </PlotSection>
    </div>
    <p className="text-xs text-muted-foreground">Timeline and confidence use the loaded history: up to 500 sessions and 2,000 answers. Retention uses all recorded observations.</p>
  </div>;
}

export function TopicRadarChart({ insights }: { insights: TopicInsight[] }) {
  const data = radarData(insights);
  return <div className="my-8"><PlotSection title="Topic recall radar" note="First and latest recall scores for up to six topics, ordered by existing revision priority. Lower scores indicate weaker recorded recall.">
    {!data.length ? <NoChart>No recall evidence in this group yet. Unstudied topics are not assigned a score.</NoChart> : <>
      {data.length >= 3 ? <ChartContainer config={config} className="h-80 w-full aspect-auto" aria-label="Topic recall radar"><RadarChart accessibilityLayer data={data} outerRadius="65%">
        <PolarGrid stroke="var(--border)" /><PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} /><PolarRadiusAxis domain={[0, 100]} tickCount={5} tickFormatter={percentLabel} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} /><Tooltip content={<MemoryTooltip />} /><Legend content={<ChartLegendContent className="flex-wrap" />} />
        <Radar dataKey="first" name="First recall" stroke="var(--color-first)" fill="var(--color-first)" fillOpacity={0.08} strokeDasharray="5 5" isAnimationActive={false} /><Radar dataKey="latest" name="Latest recall" stroke="var(--color-latest)" fill="var(--color-latest)" fillOpacity={0.18} dot={{ r: 4 }} isAnimationActive={false} />
      </RadarChart></ChartContainer> : <><p className="mb-3 text-sm text-muted-foreground">A radar comparison needs at least 3 topics with recall evidence. Available scores are shown below.</p><ChartContainer config={config} className="h-64 w-full aspect-auto" aria-label="Available topic recall scores"><BarChart accessibilityLayer data={data} margin={{ right: 12 }}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis {...axis} dataKey="axis" /><YAxis {...axis} domain={[0, 100]} tickFormatter={percentLabel} width={48} /><Tooltip content={<MemoryTooltip />} cursor={{ fill: "var(--muted)" }} /><Legend content={<ChartLegendContent />} /><Bar dataKey="first" name="First recall" fill="var(--color-first)" maxBarSize={48} isAnimationActive={false} /><Bar dataKey="latest" name="Latest recall" fill="var(--color-latest)" maxBarSize={48} isAnimationActive={false} /></BarChart></ChartContainer></>}
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">{data.map(row => <li key={row.id} className="flex gap-2"><span className="num shrink-0 text-brand">{row.axis}</span><span className="min-w-0 break-words">{row.title}<span className="ml-2 text-xs text-muted-foreground">{row.latest}% · {row.attempts} recalls</span></span></li>)}</ul>
    </>}
  </PlotSection></div>;
}