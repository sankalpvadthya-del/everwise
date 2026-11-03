import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { mergeAcademic, onboardingState, preferencesObject, studentSchema, type StudentDraft } from "./student-profile";

export async function saveStudentProfile(draft: StudentDraft, options: { step?: number; complete?: boolean; account?: { name: string; goals: string; autocorrect: boolean } } = {}) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Please sign in again");
  const { data: old, error: readError } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  if (readError) throw readError;
  if (options.complete || options.account) {
    const result = studentSchema.safeParse(draft);
    if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Check your academic details");
    draft = result.data;
  }
  const preferences: Record<string, Json | undefined> = options.complete || options.account ? mergeAcademic(old?.preferences, draft) : preferencesObject(old?.preferences);
  const now = new Date().toISOString();
  if (options.step !== undefined || options.complete) {
    preferences["onboarding"] = { ...onboardingState(old?.preferences), version: 1, status: options.complete ? "completed" : "in_progress", step: options.step ?? 2, draft: { ...draft }, updatedAt: now, ...(options.complete ? { completedAt: now } : {}) };
  }
  if (options.account) preferences["autocorrect"] = options.account.autocorrect;
  const canonical = options.complete || options.account ? { academic_level: draft.level, subjects: [...new Set(draft.subjects)], daily_study_goal: draft.daily } : {};
  const { error } = await supabase.from("profiles").upsert({ id: auth.user.id, ...canonical, ...(options.account ? { display_name: options.account.name.trim() || null, learning_goals: options.account.goals.trim() || null } : {}), preferences, updated_at: now });
  if (error) throw error;
}