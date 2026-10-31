import { createFileRoute } from "@tanstack/react-router";
import { MemoryView } from "@/components/MemoryViews";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/forgetting-radar")({ head: () => pageMeta("Forgetting Radar", "Topics due for review based on your recorded recall."), component: Radar });
function Radar() { return <MemoryView radar />; }