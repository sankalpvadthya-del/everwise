import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

export const LEVELS = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Other"];
export const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "Cambridge", "Other"];
export const LANGUAGES = ["Hindi", "Telugu", "Sanskrit", "Other", "Not applicable"];
export const SUBJECTS = ["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "Social Science", "History", "Geography", "Computer Science"];
export const studentSchema = z.object({
  level: z.string().trim().min(1, "Choose your academic level").max(100),
  board: z.string().trim().min(1, "Choose your education board").max(100),
  year: z.string().trim().min(1, "Enter your academic year").max(40),
  subjects: z.array(z.string().trim().min(1).max(80)).min(1, "Select at least one subject").max(30),
  language: z.string().trim().min(1, "Choose a second language or Not applicable").max(100),
  daily: z.number().int("Use whole minutes").min(5, "Choose at least 5 minutes").max(600, "Choose no more than 600 minutes"),
});
export type StudentDraft = z.infer<typeof studentSchema>;
export function preferencesObject(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
export function academicDraft(profile: { academic_level: string | null; subjects: string[]; daily_study_goal: number; preferences: Json } | null | undefined): StudentDraft {
  const academic = preferencesObject(preferencesObject(profile?.preferences)["academic"]);
  return { level: profile?.academic_level ?? "", subjects: profile?.subjects ?? [], daily: profile?.daily_study_goal ?? 30,
    board: typeof academic["board"] === "string" ? academic["board"] : "", year: typeof academic["year"] === "string" ? academic["year"] : "", language: typeof academic["language"] === "string" ? academic["language"] : "Not applicable" };
}
export function onboardingState(preferences: Json | undefined) {
  return preferencesObject(preferencesObject(preferences)["onboarding"]);
}
export function needsOnboarding(preferences: Json | undefined, enrolled: boolean) {
  const state = onboardingState(preferences);
  return state["status"] !== "completed" && (enrolled || state["status"] === "in_progress");
}
export function resumeDraft(preferences: Json | undefined, fallback: StudentDraft): StudentDraft {
  const saved = preferencesObject(onboardingState(preferences)["draft"]);
  return { ...fallback,
    level: typeof saved["level"] === "string" ? saved["level"] : fallback.level,
    board: typeof saved["board"] === "string" ? saved["board"] : fallback.board,
    year: typeof saved["year"] === "string" ? saved["year"] : fallback.year,
    language: typeof saved["language"] === "string" ? saved["language"] : fallback.language,
    daily: typeof saved["daily"] === "number" ? saved["daily"] : fallback.daily,
    subjects: Array.isArray(saved["subjects"]) ? saved["subjects"].filter((s): s is string => typeof s === "string") : fallback.subjects };
}
export function mergeAcademic(preferences: Json | undefined, draft: StudentDraft) {
  const old = preferencesObject(preferences);
  return { ...old, academic: { ...preferencesObject(old["academic"]), board: draft.board.trim(), year: draft.year.trim(), language: draft.language.trim() } };
}
export function dailyStudyProgress(sessions: { status: string; started_at: string; completed_at: string | null; duration_seconds: number | null }[], goal: number, now = new Date()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const seconds = sessions.reduce((sum, s) => {
    if (s.status !== "completed" || !s.completed_at || !s.duration_seconds || s.duration_seconds < 0) return sum;
    const finished = Date.parse(s.completed_at); const began = Date.parse(s.started_at);
    if (!Number.isFinite(finished) || !Number.isFinite(began) || finished < +start || finished >= +end) return sum;
    return sum + Math.min(s.duration_seconds, Math.max(0, (finished - Math.max(began, +start)) / 1000));
  }, 0);
  return { minutes: Math.floor(seconds / 60), percent: Math.min(100, Math.round(seconds / (goal * 60) * 100)) };
}