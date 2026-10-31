import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  LayoutDashboard, BookOpen, Fingerprint, Radar, Stethoscope, CalendarCheck, History, User, Settings, LogOut,
  PanelLeftClose, PanelLeftOpen, Menu, GraduationCap, Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAiStatus } from "@/lib/ai.functions";
import { LogoMark } from "./Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/learn", label: "Topics", icon: BookOpen },
  { to: "/memory-fingerprint", label: "Memory Fingerprint", icon: Fingerprint },
  { to: "/forgetting-radar", label: "Forgetting Radar", icon: Radar },
  { to: "/weak-spots", label: "Weak Spots", icon: Stethoscope },
  { to: "/revision-planner", label: "Revision Planner", icon: CalendarCheck },
  { to: "/exam-mode", label: "Exam-Day Mode", icon: GraduationCap },
  { to: "/history", label: "History", icon: History },
] as const;
const SECONDARY = [
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const item = (n: (typeof NAV)[number] | (typeof SECONDARY)[number]) => {
    const active = path === n.to || path.startsWith(n.to + "/");
    return (
      <Link
        key={n.to}
        to={n.to}
        onClick={onNavigate}
        title={collapsed ? n.label : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
          collapsed && "justify-center px-0",
        )}
      >
        <n.icon className="size-4 shrink-0" />
        {!collapsed && <span>{n.label}</span>}
      </Link>
    );
  };
  return (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
      {NAV.map(item)}
      <div className="my-3 border-t border-sidebar-border" />
      {SECONDARY.map(item)}
    </nav>
  );
}

function AiBadge() {
  const { data } = useQuery({ queryKey: ["ai-status"], queryFn: () => getAiStatus(), staleTime: 60_000 });
  if (!data) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", data.online ? "text-muted-foreground" : "border-warning/40 bg-warning-soft text-warning")}>
      <span className={cn("size-1.5 rounded-full", data.online ? "bg-success" : "bg-warning")} />
      {data.online ? `AI live · ${data.provider === "fastapi" ? data.model : "Lovable AI"}` : "AI backend offline"}
    </span>
  );
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", search: {} });
  };
  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 transition-[width] md:flex", collapsed ? "w-16" : "w-64")}>
        <div className={cn("mb-6 flex items-center gap-2.5 px-2 pt-1", collapsed && "justify-center px-0")}>
          <LogoMark />
          {!collapsed && <span className="font-display text-sm font-semibold">AI Memory Trainer</span>}
        </div>
        <NavList collapsed={collapsed} />
        <Button variant="ghost" onClick={signOut} className={cn("mt-2 justify-start gap-3 text-sidebar-foreground/80", collapsed && "justify-center px-0")}>
          <LogOut className="size-4" />
          {!collapsed && "Sign out"}
        </Button>
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-4">
          <SheetTitle className="mb-4 flex items-center gap-2.5"><LogoMark /> AI Memory Trainer</SheetTitle>
          <NavList onNavigate={() => setOpen(false)} />
          <Button variant="ghost" className="justify-start" onClick={signOut}><LogOut className="size-4" /> Sign out</Button>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
          <div className="flex-1" />
          <AiBadge />
          <Button asChild size="sm"><Link to="/learn/new"><Plus className="size-4" /> New topic</Link></Button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
