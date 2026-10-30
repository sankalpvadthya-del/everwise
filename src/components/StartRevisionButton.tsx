import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startRevisionSession, generateQuestions } from "@/lib/ai.functions";

export function StartRevisionButton({
  topicId, hasHistory = true, label = "Start revision", focusConcepts, size = "sm", variant = "default",
}: { topicId: string; hasHistory?: boolean; label?: string; focusConcepts?: string[]; size?: "sm" | "default"; variant?: "default" | "outline" }) {
  const navigate = useNavigate();
  const startRev = useServerFn(startRevisionSession);
  const gen = useServerFn(generateQuestions);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      let sessionId: string | null = null;
      if (focusConcepts?.length) {
        sessionId = (await gen({ data: { topicId, types: ["short_answer", "conceptual", "mcq"], difficulty: "mixed", count: 5, focusConcepts } })).sessionId;
      } else if (hasHistory) {
        sessionId = (await startRev({ data: { topicId } })).sessionId;
      }
      if (!sessionId) sessionId = (await gen({ data: { topicId, types: ["short_answer", "mcq", "conceptual"], difficulty: "mixed", count: 5 } })).sessionId;
      navigate({ to: "/study/$sessionId", params: { sessionId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start a session");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button size={size} variant={variant} onClick={go} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} {busy ? "Preparing…" : label}
    </Button>
  );
}
