import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
  it.each(["dashboard", "memory-fingerprint", "forgetting-radar", "weak-spots", "revision-planner", "exam-mode", "history", "profile", "settings"])("resolves /%s to its dashboard page", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(`/${path}`).at(-1)?.routeId).toBe(`/_authenticated/${path}`);
  });
  it("resolves the new-topic page before the dynamic topic route", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/learn/new").at(-1)?.routeId).toBe("/_authenticated/learn/new");
  });
});
