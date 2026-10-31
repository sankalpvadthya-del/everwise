import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { RadarStatus } from "@/lib/memory-engine";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string | undefined; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-brand">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "default", icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "success" | "warning" | "danger"; icon?: ReactNode }) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {icon && <span className={cn("rounded-md p-1.5", tone === "success" && "bg-success-soft text-success", tone === "warning" && "bg-warning-soft text-warning", tone === "danger" && "bg-danger-soft text-destructive", tone === "default" && "bg-brand-soft text-brand")}>{icon}</span>}
      </div>
      <div className="num mt-3 text-3xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card-surface flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-4 rounded-xl bg-brand-soft p-3 text-brand">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {body && <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const toneMap = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
  brand: "bg-brand-soft text-brand",
  muted: "bg-muted text-muted-foreground",
};
export function Pill({ tone = "muted", children, className }: { tone?: keyof typeof toneMap; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", toneMap[tone], className)}>{children}</span>;
}

export function scoreTone(p: number | null): keyof typeof toneMap {
  if (p == null) return "muted";
  if (p >= 70) return "success";
  if (p >= 50) return "warning";
  return "danger";
}

export function RadarPill({ status }: { status: RadarStatus }) {
  const m: Record<RadarStatus, [keyof typeof toneMap, string]> = {
    overdue: ["danger", "Overdue for review"],
    recommended: ["warning", "Revision recommended"],
    stable: ["success", "Stable in recent attempts"],
    insufficient: ["muted", "Insufficient history"],
  };
  return <Pill tone={m[status][0]}>{m[status][1]}</Pill>;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
    </div>
  );
}
