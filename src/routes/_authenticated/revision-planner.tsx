import { createFileRoute } from "@tanstack/react-router";
import { PlannerView } from "@/components/PlanningViews";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/revision-planner")({ head: () => pageMeta("Revision Planner", "Manage spaced reviews and schedule revision sessions."), component: PlannerView });