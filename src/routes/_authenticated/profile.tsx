import { createFileRoute } from "@tanstack/react-router";
import { AccountView } from "@/components/AccountViews";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/profile")({ head: () => pageMeta("Profile", "Your academic profile and learning goals."), component: AccountView });