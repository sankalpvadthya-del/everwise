import { createFileRoute } from "@tanstack/react-router";
import { WeakSpotsView } from "@/components/MemoryViews";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/weak-spots")({ head: () => pageMeta("Weak Spots", "Recorded misconceptions and targeted recall practice."), component: WeakSpotsView });