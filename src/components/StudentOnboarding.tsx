import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { profileQ } from "@/lib/queries";
import { academicDraft, needsOnboarding, onboardingState, resumeDraft, studentSchema, type StudentDraft } from "@/lib/student-profile";
import { saveStudentProfile } from "@/lib/student-profile-save";
import { AcademicFields } from "./AcademicFields";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Progress } from "./ui/progress";

export function StudentOnboarding() {
  const profile = useQuery(profileQ());
  const { user } = useRouter().options.context as { user?: { user_metadata?: Record<string, unknown> } };
  // Identity is provided by the managed authenticated layout, not a second auth listener.
  const router = useRouter();
  const authenticated = router.state.matches.find(match => match.routeId === "/_authenticated")?.context as { user?: { user_metadata?: Record<string, unknown> } } | undefined;
  const enrolled = (authenticated?.user ?? user)?.user_metadata?.["onboarding_version"] === 1;
  const [dismissed, setDismissed] = useState(false);
  if (profile.isLoading || profile.error || !needsOnboarding(profile.data?.preferences, enrolled)) return null;
  const state = onboardingState(profile.data?.preferences);
  const step = typeof state["step"] === "number" ? Math.min(2, Math.max(0, state["step"])) : 0;
  return <><div className="border-b bg-brand-soft px-4 py-3 text-sm"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2"><span>Finish your student profile</span><Button size="sm" variant="outline" onClick={() => setDismissed(false)}>Resume setup</Button></div></div>{!dismissed && <Wizard initial={resumeDraft(profile.data?.preferences, academicDraft(profile.data))} initialStep={step} onDismiss={() => setDismissed(true)} />}</>;
}
function Wizard({ initial, initialStep, onDismiss }: { initial: StudentDraft; initialStep: number; onDismiss: () => void }) {
  const [draft, setDraft] = useState(initial); const [step, setStep] = useState(initialStep); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [completed, setCompleted] = useState(false);
  const qc = useQueryClient();
  const persist = async (nextStep: number, complete = false, dismiss = false) => {
    if (busy) return;
    setError("");
    if (!dismiss && nextStep > step) {
      const fields = step === 0 ? studentSchema.pick({ level: true, board: true, year: true }) : studentSchema.pick({ subjects: true, language: true });
      const result = fields.safeParse(draft); if (!result.success) { setError(result.error.issues[0]?.message ?? "Check your details"); return; }
    }
    setBusy(true);
    try { await saveStudentProfile(draft, { step: nextStep, complete }); if (complete) { setCompleted(true); toast.success("Student profile ready"); } else if (dismiss) onDismiss(); else setStep(nextStep); await qc.invalidateQueries({ queryKey: ["profile"] }); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't save your profile"); } finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={() => { if (!busy) void persist(step, false, true); }}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto motion-reduce:animate-none">
    {completed ? <><CheckCircle2 className="size-10 text-success" /><DialogTitle>Your student profile is ready</DialogTitle><DialogDescription>{draft.level} · {draft.board} · {draft.daily} minutes a day</DialogDescription><p className="text-sm text-muted-foreground">{draft.subjects.join(" · ")}</p><Button onClick={onDismiss}>Continue to your dashboard<ArrowRight className="size-4" /></Button></> : <>
      <div className="flex items-center gap-3"><GraduationCap className="size-6 text-brand" /><span className="text-xs font-medium text-muted-foreground">STUDENT PROFILE · STEP {step + 1} OF 3</span></div><DialogTitle>{["Your academic context", "Your subjects & language", "Your daily study goal"][step]}</DialogTitle><DialogDescription>{["Set your class, board and academic year.", "Choose the subjects you are studying this year.", "Choose a realistic daily target. You can change it later."][step]}</DialogDescription><Progress value={(step + 1) / 3 * 100} aria-label="Setup progress" />
      <form onSubmit={e => { e.preventDefault(); void persist(Math.min(2, step + 1), step === 2); }} className="space-y-6" noValidate><AcademicFields draft={draft} onChange={setDraft} section={step === 0 ? "context" : step === 1 ? "subjects" : "goal"} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap justify-between gap-3 border-t pt-4"><Button type="button" variant="ghost" disabled={busy} onClick={() => void persist(step, false, true)}>Save & finish later</Button><div className="flex gap-2">{step > 0 && <Button type="button" variant="outline" disabled={busy} onClick={() => void persist(step - 1)} aria-label="Previous step"><ArrowLeft className="size-4" /></Button>}<Button disabled={busy}>{busy ? "Saving…" : step === 2 ? "Complete setup" : "Continue"}<ArrowRight className="size-4" /></Button></div></div></form>
    </>}
  </DialogContent></Dialog>;
}