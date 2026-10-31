import { createFileRoute } from "@tanstack/react-router";
import { MemoryView } from "@/components/MemoryViews";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/memory-fingerprint")({ head: () => pageMeta("Memory Fingerprint", "Your recall trends, confidence and review evidence."), component: MemoryView });