import { createFileRoute } from "@tanstack/react-router";
import { HistoryView } from "@/components/MemoryViews";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/history")({ head: () => pageMeta("Session History", "Resume recall sessions and review completed results."), component: HistoryView });