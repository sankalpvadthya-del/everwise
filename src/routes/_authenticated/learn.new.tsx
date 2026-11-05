import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
import { profileQ } from "@/lib/queries";
import { StudyCreation } from "@/components/StudyCreation";

export const Route = createFileRoute("/_authenticated/learn/new")({
  head: () => pageMeta("Start a chapter", "Create a curriculum-aware lesson from verified textbooks or your own study material."),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQ()),
  component: StudyCreation,
});
