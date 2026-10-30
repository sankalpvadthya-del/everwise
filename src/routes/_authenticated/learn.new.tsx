import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, FileUp, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractText, MAX_CHARS } from "@/lib/extract";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  title: z.string().trim().min(2, "Give the topic a name").max(200),
  subject: z.string().trim().min(1, "Enter a subject").max(80),
  description: z.string().max(1000).optional(),
  source_text: z.string().max(MAX_CHARS).optional(),
  exam_date: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/learn/new")({
  head: () => ({ meta: [{ title: "New topic — AI Memory Trainer" }, { name: "description", content: "Add a topic or upload study material." }] }),
  component: NewTopic,
});

function NewTopic() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [file, setFile] = useState<{ name: string; type: string; chars: number } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const { register, handleSubmit, setValue, watch, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { subject: "" } });
  const src = watch("source_text") ?? "";

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setExtracting(true);
    try {
      const text = await extractText(f);
      setValue("source_text", text, { shouldValidate: true });
      setFile({ name: f.name, type: f.name.split(".").pop() ?? "", chars: text.length });
      if (!watch("title")) setValue("title", f.name.replace(/\.[^.]+$/, ""));
      toast.success(`Extracted ${text.length.toLocaleString()} characters`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    } finally {
      setExtracting(false);
    }
  };

  const onSubmit = handleSubmit(async (v) => {
    const { data, error } = await supabase
      .from("topics")
      .insert({
        title: v.title,
        subject: v.subject,
        description: v.description || null,
        source_text: v.source_text || null,
        exam_date: v.exam_date || null,
        source_metadata: file ? { file_name: file.name, file_type: file.type, chars: file.chars } : {},
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["topics"] });
    navigate({ to: "/learn/$topicId", params: { topicId: data.id }, search: { explain: true } });
  });

  return (
    <div className="max-w-3xl">
      <Link to="/learn" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Topics</Link>
      <PageHeader title="Learn a new topic" description="Name a topic, and optionally add notes or a document so explanations and questions are grounded in your material." />
      <form onSubmit={onSubmit} className="card-surface space-y-5 p-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Topic</Label>
            <Input id="title" placeholder="e.g. Photosynthesis" {...register("title")} />
            {formState.errors.title && <p className="text-xs text-destructive">{formState.errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" placeholder="e.g. Biology" {...register("subject")} />
            {formState.errors.subject && <p className="text-xs text-destructive">{formState.errors.subject.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Learning objective <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="description" placeholder="What should you be able to do?" {...register("description")} />
        </div>
        <div className="space-y-1.5">
          <Label>Study material <span className="text-muted-foreground">(optional · PDF, DOCX, TXT · 10 MB max)</span></Label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring">
            {extracting ? <Loader2 className="size-5 animate-spin" /> : <FileUp className="size-5" />}
            <span>{extracting ? "Extracting text…" : "Click to upload a file"}</span>
            <input type="file" accept=".pdf,.docx,.txt,.md" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} disabled={extracting} />
          </label>
          {file && (
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
              <span>{file.name} · {file.chars.toLocaleString()} chars</span>
              <button type="button" onClick={() => { setFile(null); setValue("source_text", ""); }} aria-label="Remove file"><X className="size-4" /></button>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="source_text">Or paste notes</Label>
          <Textarea id="source_text" rows={8} placeholder="Paste lecture notes, a textbook passage…" {...register("source_text")} />
          <div className="text-right text-xs text-muted-foreground">{src.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}</div>
        </div>
        <div className="space-y-1.5 sm:max-w-xs">
          <Label htmlFor="exam_date">Exam date <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="exam_date" type="date" {...register("exam_date")} />
        </div>
        <div className="flex justify-end gap-2">
          <Button asChild variant="ghost"><Link to="/learn">Cancel</Link></Button>
          <Button type="submit" disabled={formState.isSubmitting || extracting}>{formState.isSubmitting ? "Creating…" : "Create & explain"}</Button>
        </div>
      </form>
    </div>
  );
}
