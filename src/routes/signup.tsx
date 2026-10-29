import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    name: z.string().trim().min(1, "Enter your name").max(80),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — AI Memory Trainer" }, { name: "description", content: "Create a free account and start remembering what you learn." }, { property: "og:title", content: "Create account — AI Memory Trainer" }, { property: "og:description", content: "Create a free account and start remembering what you learn." }] }),
  component: Signup,
});

function Signup() {
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const onSubmit = handleSubmit(async (v) => {
    setErr(null);
    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { display_name: v.name } },
    });
    if (error) return setErr(error.message);
    if (data.session) window.location.href = "/dashboard";
    else setSent(v.email);
  });
  if (sent)
    return (
      <AuthLayout title="Check your email" footer={<Link to="/login" className="font-medium text-foreground hover:underline">Back to log in</Link>}>
        <div className="flex flex-col items-center text-center">
          <MailCheck className="size-10 text-brand" />
          <p className="mt-4 text-sm text-muted-foreground">We sent a confirmation link to <strong className="text-foreground">{sent}</strong>. Click it to activate your account.</p>
        </div>
      </AuthLayout>
    );
  const field = (id: "name" | "email" | "password" | "confirm", label: string, type = "text", ac?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} autoComplete={ac} {...register(id)} aria-invalid={!!formState.errors[id]} />
      {formState.errors[id] && <p className="text-xs text-destructive">{formState.errors[id]?.message}</p>}
    </div>
  );
  return (
    <AuthLayout title="Create your account" subtitle="Start building your Memory Fingerprint." footer={<>Already have an account? <Link to="/login" search={{ redirect: undefined }} className="font-medium text-foreground hover:underline">Log in</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {field("name", "Name", "text", "name")}
        {field("email", "Email", "email", "email")}
        {field("password", "Password", "password", "new-password")}
        {field("confirm", "Confirm password", "password", "new-password")}
        {err && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>{formState.isSubmitting ? "Creating…" : "Create account"}</Button>
        <p className="text-center text-xs text-muted-foreground">By signing up you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
      </form>
    </AuthLayout>
  );
}
