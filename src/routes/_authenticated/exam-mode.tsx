import { createFileRoute } from "@tanstack/react-router";
import { ExamView } from "@/components/PlanningViews";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/exam-mode")({ head: () => pageMeta("Exam-Day Mode", "Prioritize exam revision and practise quick recall."), component: ExamView });