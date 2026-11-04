import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { profileQ } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Loading, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AcademicFields } from "./AcademicFields";
import { academicDraft, studentSchema, type StudentDraft } from "@/lib/student-profile";
import { saveStudentProfile } from "@/lib/student-profile-save";

export function AccountView({ settings = false }: { settings?: boolean }) {
  const profile = useQuery(profileQ()); const qc = useQueryClient();
  const [name, setName] = useState(""); const [goals, setGoals] = useState(""); const [daily, setDaily] = useState(30);
  const [autocorrect, setAutocorrect] = useState(true); const [dark, setDark] = useState(false); const [busy, setBusy] = useState(false);
  const [academic, setAcademic] = useState<StudentDraft>(academicDraft(null));
  useEffect(() => {
    const p = profile.data;
    setAcademic(academicDraft(p));
    if (p) { setName(p.display_name ?? ""); setGoals(p.learning_goals ?? ""); setDaily(p.daily_study_goal); const pref = p.preferences; setAutocorrect(!(pref && typeof pref === "object" && !Array.isArray(pref) && pref["autocorrect"] === false)); }
    setDark(document.documentElement.classList.contains("dark"));
  }, [profile.data]);
  const save = async () => {
    setBusy(true);
    try {
      if (!settings) {
        const checked = studentSchema.safeParse(academic);
        if (!checked.success) throw new Error(checked.error.issues[0]?.message ?? "Check your academic details");
        await saveStudentProfile(checked.data, { account: { name, goals, autocorrect } });
        await qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Profile saved"); return;
      }
      const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) throw new Error("Please sign in again");
      if (!Number.isInteger(daily) || daily < 5 || daily > 600) throw new Error("Daily goal must be 5–600 whole minutes");
      const { data: current, error: readError } = await supabase.from("profiles").select("preferences").eq("id", auth.user.id).maybeSingle();
      if (readError) throw readError;
      const old = current?.preferences;
      const preferences = old && typeof old === "object" && !Array.isArray(old) ? old : {};
      const { error } = await supabase.from("profiles").upsert({ id: auth.user.id, daily_study_goal: daily, preferences: { ...preferences, autocorrect }, updated_at: new Date().toISOString() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile"] }); toast.success(settings ? "Settings saved" : "Profile saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); } finally { setBusy(false); }
  };
  if (profile.isLoading) return <Loading />;
  if (profile.error) return <EmptyState title="Couldn't load profile" body={profile.error.message} />;
  return <div className="max-w-2xl"><PageHeader title={settings ? "Settings" : "Profile"} /><form className="space-y-5" onSubmit={e => { e.preventDefault(); void save(); }}>
    {settings ? <><div className="flex items-center justify-between border-b py-4"><Label htmlFor="autocorrect">Recall spelling autocorrect</Label><Switch id="autocorrect" checked={autocorrect} onCheckedChange={setAutocorrect} /></div><div className="flex items-center justify-between border-b py-4"><Label htmlFor="dark-theme">Dark theme</Label><Switch id="dark-theme" checked={dark} onCheckedChange={v => { setDark(v); document.documentElement.classList.toggle("dark", v); localStorage.setItem("amt-theme", v ? "dark" : "light"); }} /></div></> : <>
      <div className="space-y-2"><Label htmlFor="display-name">Display name</Label><Input id="display-name" value={name} maxLength={100} onChange={e => setName(e.target.value)} /></div>
      <AcademicFields draft={academic} onChange={setAcademic} />
      <div className="space-y-2"><Label htmlFor="learning-goals">Learning goals</Label><Textarea id="learning-goals" value={goals} onChange={e => setGoals(e.target.value)} /></div>
    </>}
    {settings && <div className="space-y-2"><Label htmlFor="daily-goal">Daily study goal (minutes)</Label><Input id="daily-goal" type="number" required min={5} max={600} value={daily} onChange={e => setDaily(Number(e.target.value))} /></div>}
    <Button disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
  </form></div>;
}