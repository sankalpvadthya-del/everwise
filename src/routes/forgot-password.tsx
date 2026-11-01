import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — AI Memory Trainer" }, { name: "description", content: "Get a link to reset your password." }, { property: "og:title", content: "Reset password — AI Memory Trainer" }, { property: "og:description", content: "Get a link to reset your password." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [err, setErr] = useState<string | null>(null);
  return (
    <AuthLayout title="Forgot your password?" subtitle="We'll email you a reset link." footer={<Link to="/login" search={{}} className="hover:text-foreground">Back to log in</Link>}>
      {state === "sent" ? (
        <p className="text-sm text-muted-foreground">If an account exists for <strong className="text-foreground">{email}</strong>, a reset link is on its way.</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email");
            setErr(null);
            setState("busy");
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
            if (error) { setErr(error.message); setState("idle"); } else setState("sent");
          }}
        >
          <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <Button className="w-full" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
