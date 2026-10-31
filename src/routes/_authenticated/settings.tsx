import { createFileRoute } from "@tanstack/react-router";
import { AccountView } from "@/components/AccountViews";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/settings")({ head: () => pageMeta("Settings", "Recall autocorrect, study targets and appearance preferences."), component: Settings });
function Settings() { return <AccountView settings />; }