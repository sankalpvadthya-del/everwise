import type { ReactNode } from "react";
import { Logo } from "./Logo";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b"><div className="mx-auto flex h-16 max-w-3xl items-center px-4"><Logo /></div></header>
      <article className="mx-auto max-w-3xl px-4 py-12 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-xs">Last updated: October 2026</p>
        {children}
      </article>
    </div>
  );
}
