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

export function AccountView({ settings = false }: { settings?: boolean }) {
  const profile = useQuery(profileQ()); const qc = useQueryClient();
  const [name, setName] = useState(""); const [level, setLevel] = useState(""); const [subjects, setSubjects] = useState(""); const [goals, setGoals] = useState(""); const [daily, setDaily] = useState(30);
  const [autocorrect, setAutocorrect] = useState(true); const [dark, setDark] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const p = profile.data;
    if (p) { setName(p.display_name ?? ""); setLevel(p.academic_level ?? ""); setSubjects(p.subjects.join(", ")); setGoals(p.learning_goals ?? ""); setDaily(p.daily_study_goal); const pref = p.preferences; setAutocorrect(!(pref && typeof pref === "object" && !Array.isArray(pref) && pref["autocorrect"] === false)); }
    setDark(document.documentElement.classList.contains("dark"));
  }, [profile.data]);
  const save = async () => {
    setBusy(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) throw new Error("Please sign in again");
      const old = profile.data?.preferences;
      const preferences = old && typeof old === "object" && !Array.isArray(old) ? old : {};
      const { error } = await supabase.from("profiles").upsert({ id: auth.user.id, display_name: name.trim() || null, academic_level: level || null, subjects: subjects.split(",").map(s => s.trim()).filter(Boolean), learning_goals: goals || null, daily_study_goal: daily, preferences: { ...preferences, autocorrect }, updated_at: new Date().toISOString() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile"] }); toast.success(settings ? "Settings saved" : "Profile saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); } finally { setBusy(false); }
  };
  if (profile.isLoading) return <Loading />;
  if (profile.error) return <EmptyState title="Couldn't load profile" body={profile.error.message} />;
  return <div className="max-w-2xl"><PageHeader title={settings ? "Settings" : "Profile"} /><form className="space-y-5" onSubmit={e => { e.preventDefault(); void save(); }}>
    {settings ? <><div className="flex items-center justify-between border-b py-4"><Label htmlFor="autocorrect">Recall spelling autocorrect</Label><Switch id="autocorrect" checked={autocorrect} onCheckedChange={setAutocorrect} /></div><div className="flex items-center justify-between border-b py-4"><Label htmlFor="dark-theme">Dark theme</Label><Switch id="dark-theme" checked={dark} onCheckedChange={v => { setDark(v); document.documentElement.classList.toggle("dark", v); localStorage.setItem("amt-theme", v ? "dark" : "light"); }} /></div></> : <>
      <div className="space-y-2"><Label htmlFor="display-name">Display name</Label><Input id="display-name" value={name} maxLength={100} onChange={e => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="academic-level">Academic level</Label><Input id="academic-level" value={level} onChange={e => setLevel(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="subjects">Subjects</Label><Input id="subjects" value={subjects} onChange={e => setSubjects(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="learning-goals">Learning goals</Label><Textarea id="learning-goals" value={goals} onChange={e => setGoals(e.target.value)} /></div>
    </>}
    <div className="space-y-2"><Label htmlFor="daily-goal">Daily study goal (minutes)</Label><Input id="daily-goal" type="number" required min={5} max={600} value={daily} onChange={e => setDaily(Number(e.target.value))} /></div>
    <Button disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
  </form></div>;
}