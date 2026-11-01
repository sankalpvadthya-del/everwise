import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password — AI Memory Trainer" }, { name: "description", content: "Choose a new password for your account." }, { property: "og:title", content: "Set a new password — AI Memory Trainer" }, { property: "og:description", content: "Choose a new password for your account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <AuthLayout title="Set a new password">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw.length < 8) return setErr("At least 8 characters");
          if (pw !== pw2) return setErr("Passwords don't match");
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password: pw });
          setBusy(false);
          if (error) return setErr(error.message);
          toast.success("Password updated");
          navigate({ to: "/dashboard" });
        }}
      >
        <div className="space-y-1.5"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="pw2">Confirm password</Label><Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <Button className="w-full" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
      </form>
    </AuthLayout>
  );
}
