import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Brain, Repeat, Radar, Stethoscope, CalendarCheck, LineChart, Gauge, GraduationCap, FileText, Fingerprint, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Memory Trainer — Don't just learn it. Remember it." },
      { name: "description", content: "Turn study material into explanations and active-recall questions, then let the Memory Fingerprint Engine tell you what to revise and when." },
      { property: "og:title", content: "AI Memory Trainer — Don't just learn it. Remember it." },
      { property: "og:description", content: "Active recall, spaced repetition and personalised revision powered by the Memory Fingerprint Engine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const demoCurve = [
  { d: "Day 0", v: 92 }, { d: "Day 1", v: 78 }, { d: "Day 3", v: 84 }, { d: "Day 7", v: 81 }, { d: "Day 14", v: 88 },
];

const FEATURES = [
  { icon: Brain, title: "AI explanations", body: "Overviews, key concepts, definitions and common misconceptions from your own notes." },
  { icon: FileText, title: "Questions from your material", body: "Upload PDF, DOCX or TXT and practise with grounded questions." },
  { icon: Repeat, title: "Active recall", body: "Answer before you see the solution, then rate your confidence." },
  { icon: CalendarCheck, title: "Spaced repetition", body: "Reviews scheduled at 1, 3, 7 and 14 days — adjusted to how you actually perform." },
  { icon: Radar, title: "Forgetting Radar", body: "See which topics are overdue, slipping, or stable — with the evidence behind it." },
  { icon: Stethoscope, title: "Weak-spot diagnostics", body: "Recurring mistakes grouped by concept with targeted practice." },
  { icon: Gauge, title: "Confidence calibration", body: "Learn when you're sure and right — and when you're sure and wrong." },
  { icon: GraduationCap, title: "Exam-Day Mode", body: "A prioritised checklist built from your recorded performance." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="Primary">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#fingerprint" className="hover:text-foreground">Memory Fingerprint</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/login">Log in</Link></Button>
            <Button asChild size="sm"><Link to="/signup">Start free</Link></Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="grid-dots absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Fingerprint className="size-3.5 text-brand" /> Powered by the Memory Fingerprint Engine
            </div>
            <h1 className="text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
              Don't just learn it.<br /><span className="text-brand">Remember it.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Turn notes into explanations and recall questions. Every answer teaches the engine how <em>you</em> remember — so it can tell you exactly what to revise, and when.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/signup">Start learning <ArrowRight className="size-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><a href="#how">See how it works</a></Button>
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-medium">Memory Fingerprint</div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Illustrative example</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[["Recent recall", "84%"], ["Stable topics", "6 / 9"], ["Weak concepts", "4"]].map(([l, v]) => (
                <div key={l} className="rounded-lg border p-3">
                  <div className="text-[11px] text-muted-foreground">{l}</div>
                  <div className="num mt-1 text-xl font-semibold">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 h-36">
              <ResponsiveContainer>
                <AreaChart data={demoCurve} margin={{ left: -24, right: 4, top: 8 }}>
                  <defs>
                    <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <Area dataKey="v" stroke="var(--brand)" strokeWidth={2} fill="url(#lg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-2">
              {[["Photosynthesis — light reactions", "Revision recommended", "bg-warning-soft text-warning"], ["Newton's second law", "Stable in recent attempts", "bg-success-soft text-success"]].map(([t, s, c]) => (
                <div key={t} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{t}</span><span className={`rounded-full px-2 py-0.5 text-[11px] ${c}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="border-y bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              ["01", "Add a topic", "Type a topic, paste notes, or upload a document."],
              ["02", "Understand it", "Get a structured, source-grounded explanation."],
              ["03", "Recall it", "Answer generated questions and rate your confidence."],
              ["04", "Keep it", "The engine schedules reviews and flags weak concepts."],
            ].map(([n, t, b]) => (
              <div key={n}>
                <div className="num text-sm text-brand">{n}</div>
                <div className="mt-2 font-display font-semibold">{t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold">Everything you need to retain what you study</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-surface p-5">
              <f.icon className="size-5 text-brand" />
              <div className="mt-4 font-display font-semibold">{f.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="fingerprint" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="card-surface grid gap-8 p-8 md:grid-cols-2 md:p-12">
          <div>
            <Fingerprint className="size-8 text-brand" />
            <h2 className="mt-4 text-3xl font-semibold">The Memory Fingerprint Engine</h2>
            <p className="mt-3 text-muted-foreground">
              A transparent, rule-based model built from your real study history: recall scores, time between attempts, recurring mistakes and how well your confidence matches your results.
            </p>
          </div>
          <ul className="space-y-3 text-sm">
            {[
              [LineChart, "Only shows estimates when there's enough evidence."],
              [ShieldCheck, "Explains every recommendation — no black-box scores."],
              [Gauge, "Not a clinical or neurological measurement; a study aid."],
            ].map(([I, t], i) => {
              const Icon = I as typeof LineChart;
              return <li key={i} className="flex gap-3"><Icon className="mt-0.5 size-4 shrink-0 text-brand" /><span>{t as string}</span></li>;
            })}
          </ul>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>© 2026 AI Memory Trainer</span>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/login" className="hover:text-foreground">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
