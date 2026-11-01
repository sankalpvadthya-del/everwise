import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({ email: z.string().trim().email("Enter a valid email"), password: z.string().min(1, "Enter your password") });

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({ ...(typeof s["redirect"] === "string" && s["redirect"].startsWith("/") && !s["redirect"].startsWith("//") && !s["redirect"].includes("\\") ? { redirect: s["redirect"] } : {}) }),
  head: () => ({ meta: [{ title: "Log in — AI Memory Trainer" }, { name: "description", content: "Log in to continue your study sessions." }, { property: "og:title", content: "Log in — AI Memory Trainer" }, { property: "og:description", content: "Log in to continue your study sessions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const onSubmit = handleSubmit(async (v) => {
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword(v);
    if (error) return setErr(error.message === "Invalid login credentials" ? "Email or password is incorrect." : error.message);
    navigate({ to: redirect ?? "/dashboard" });
  });
  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue learning." footer={<>New here? <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">Create an account</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!formState.errors.email} />
          {formState.errors.email && <p className="text-xs text-destructive">{formState.errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between"><Label htmlFor="password">Password</Label><Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</Link></div>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} aria-invalid={!!formState.errors.password} />
          {formState.errors.password && <p className="text-xs text-destructive">{formState.errors.password.message}</p>}
        </div>
        {err && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>{formState.isSubmitting ? "Logging in…" : "Log in"}</Button>
      </form>
    </AuthLayout>
  );
}
