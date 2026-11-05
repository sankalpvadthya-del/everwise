import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, ChevronLeft, FileUp, Loader2, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { profileQ } from "@/lib/queries";
import { academicDraft, BOARDS, LEVELS, preferencesObject } from "@/lib/student-profile";
import { booksFor, chaptersFromContents, sectionsFromPages, DEFAULT_TEACHING, CONTENT_SECTIONS, teachingSchema, type SourcePage, type Chapter, type TeachingSettings, NCERT_CATALOGUE } from "@/lib/curriculum";
import { retrieveTextbook } from "@/lib/textbook.functions";
import { extractPdfPages, decodePdf, MAX_IMPORT_CHARS } from "@/lib/textbook-extract";
import { extractText, MAX_FILE_BYTES } from "@/lib/extract";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function Choice({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <div className="min-w-0 space-y-2"><Label>{label}</Label><Select value={value} onValueChange={v => { if (v) onChange(v); }} disabled={disabled}><SelectTrigger aria-label={label}><SelectValue placeholder={`Choose ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>;
}
const choices = (values: string[]) => [...new Set(values.filter(Boolean))].map(value => ({ value, label: value }));
type Retrieved = { pages: SourcePage[]; url: string; retrievedAt: string };

export function StudyCreation() {
  const { data: profile } = useSuspenseQuery(profileQ());
  const draft = academicDraft(profile);
  const [board, setBoard] = useState(draft.board);
  const [level, setLevel] = useState(draft.level);
  const [subject, setSubject] = useState(draft.subjects[0] ?? "");
  const [year, setYear] = useState(draft.year);
  const [source, setSource] = useState(draft.board === "CBSE" ? "NCERT" : "Upload or notes");
  const [bookId, setBookId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterNumber, setChapterNumber] = useState("");
  const [contents, setContents] = useState<Retrieved | null>(null);
  const [chapterData, setChapterData] = useState<Retrieved | null>(null);
  const [sectionId, setSectionId] = useState("all");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<{ name: string; pages?: SourcePage[] } | null>(null);
  const [examDate, setExamDate] = useState("");
  const savedTeaching = teachingSchema.safeParse(preferencesObject(profile?.preferences)["teaching"]);
  const [teaching, setTeaching] = useState<TeachingSettings>(() => savedTeaching.success ? savedTeaching.data : { ...DEFAULT_TEACHING, language: ["Hindi", "Telugu"].includes(draft.language) ? draft.language : "English" });
  const [saving, setSaving] = useState(false);
  const requestVersion = useRef(0);
  const retrieve = useServerFn(retrieveTextbook);
  const navigate = useNavigate(); const qc = useQueryClient();
  const books = booksFor(board, level, subject);
  const book = books.find(b => b.id === bookId);
  const chapter = chapters.find(c => String(c.number) === chapterNumber);
  const sections = chapterData ? sectionsFromPages(chapterData.pages) : [];
  const busy = !!status || saving;
  const clearBook = () => { requestVersion.current++; setBookId(""); setChapters([]); setChapterNumber(""); setContents(null); setChapterData(null); setSectionId("all"); setError(""); setStatus(""); };
  useEffect(() => () => { requestVersion.current++; }, []);

  const getPages = async (id: string, selected: number | "contents") => {
    const result = await retrieve({ data: { bookId: id, chapter: selected } });
    return { pages: await extractPdfPages(decodePdf(result.base64)), url: result.url, retrievedAt: result.retrievedAt };
  };
  const selectBook = async (id: string) => {
    clearBook(); setBookId(id); const version = ++requestVersion.current;
    setStatus("Reading official textbook contents…");
    try {
      const result = await getPages(id, "contents");
      if (version !== requestVersion.current) return;
      const list = chaptersFromContents(result.pages).filter(c => c.number <= (books.find(b => b.id === id)?.chapterCount ?? 0));
      if (!list.length) throw new Error("Chapter names could not be read from this textbook’s official contents. Upload a chapter PDF or use notes instead.");
      setContents(result); setChapters(list);
    } catch (e) { if (version === requestVersion.current) setError(e instanceof Error ? e.message : "Could not read textbook contents."); }
    finally { if (version === requestVersion.current) setStatus(""); }
  };
  const selectChapter = async (number: string) => {
    const version = ++requestVersion.current; setChapterNumber(number); setChapterData(null); setSectionId("all"); setError(""); setStatus("Retrieving and reading the selected chapter…");
    try {
      const result = await getPages(bookId, Number(number));
      if (version !== requestVersion.current) return;
      setChapterData(result);
    } catch (e) { if (version === requestVersion.current) setError(e instanceof Error ? e.message : "Could not import chapter."); }
    finally { if (version === requestVersion.current) setStatus(""); }
  };
  const upload = async (selected: File | undefined) => {
    if (!selected) return; setError(""); setStatus("Reading your document…");
    try {
      if (selected.size > MAX_FILE_BYTES) throw new Error("File is larger than 10 MB.");
      const pages = selected.name.toLowerCase().endsWith(".pdf") ? await extractPdfPages(new Uint8Array(await selected.arrayBuffer())) : undefined;
      const text = pages ? pages.map(p => p.text).join("\n\n") : await extractText(selected);
      setNotes(text); setFile({ name: selected.name, ...(pages ? { pages } : {}) });
      if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read document."); }
    finally { setStatus(""); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (!board || !level || !subject.trim() || !year.trim()) { setError("Choose your board, class, subject and academic year."); return; }
    const settings = teachingSchema.safeParse(teaching);
    if (!settings.success) { setError("Choose a language and at least one content section."); return; }
    const official = source === "NCERT";
    if (official && (!chapterData || !book || !chapter || !contents)) { setError("Choose and retrieve a textbook chapter first, or switch to uploads and notes."); return; }
    let text = official ? chapterData?.pages.map(p => p.text).join("\n\n") ?? "" : notes.trim();
    let pages = official ? chapterData?.pages : file?.pages;
    const selectedSection = sections.find(s => s.id === sectionId);
    if (official && selectedSection) { text = text.slice(selectedSection.start, selectedSection.end); pages = undefined; }
    if (!text.trim()) { setError("Add readable study material before starting."); return; }
    if (text.length > MAX_IMPORT_CHARS) { setError("Choose a smaller chapter or section; material must not exceed 120,000 characters."); return; }
    const topicTitle = official ? (selectedSection ? `${chapter?.title} — ${selectedSection.title}` : chapter?.title ?? "") : title.trim();
    if (topicTitle.length < 2 || topicTitle.length > 200) { setError("Topic name must be between 2 and 200 characters."); return; }
    const preliminaryText = contents?.pages.map(p => p.text).join("\n") ?? "";
    const edition = preliminaryText.match(/Revised Edition[^\n]{0,80}/i)?.[0] ?? null;
    const reprint = preliminaryText.match(/Reprint\s+\d{4}[-–]\d{2,4}/i)?.[0] ?? null;
    const metadata = { version: 1, kind: official ? "official_textbook" : file ? "upload" : "notes", board, academic_level: level, academic_year: year, teaching: settings.data,
      ...(official ? { publisher: "NCERT", textbook_id: bookId, textbook: book?.title, chapter_number: Number(chapterNumber), chapter: chapter?.title, edition, reprint, source_url: chapterData?.url, contents_url: contents?.url, retrieved_at: chapterData?.retrievedAt, catalogue_verified_at: NCERT_CATALOGUE.verifiedAt, ...(selectedSection ? { section: selectedSection.title, section_id: selectedSection.id } : {}) } : {}),
      ...(pages ? { pages } : {}), ...(file && !official ? { file_name: file.name } : {}), chars: text.length };
    setSaving(true);
    try {
      const { data, error: saveError } = await supabase.from("topics").insert({ title: topicTitle, subject: subject.trim(), description: `${settings.data.objective} · ${level} · ${board}`, source_text: text, source_metadata: metadata as Json, exam_date: examDate || null }).select("id").single();
      if (saveError) throw new Error(saveError.message);
      await qc.invalidateQueries({ queryKey: ["topics"] });
      await navigate({ to: "/learn/$topicId", params: { topicId: data.id }, search: { explain: true } });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save topic."); toast.error("Your material is still here. Please retry."); }
    finally { setSaving(false); }
  };
  return <div className="max-w-4xl">
    <Link to="/learn" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Topics</Link>
    <PageHeader title="Start a new chapter" description="Your curriculum, your textbook, your next lesson." />
    <form onSubmit={save} className="space-y-8">
      <section className="space-y-5 border-b pb-7"><h2 className="flex items-center gap-2 font-semibold"><BookOpen className="size-5 text-brand" /> Curriculum</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Choice label="Education board" value={board} options={choices([...BOARDS, "NCERT", board])} disabled={busy} onChange={v => { setBoard(v); clearBook(); setSource(v === "CBSE" || v === "NCERT" ? "NCERT" : "Upload or notes"); }} />
          <Choice label="Class" value={level} options={choices([...LEVELS, level])} disabled={busy} onChange={v => { setLevel(v); setSubject(""); clearBook(); }} />
          <Choice label="Subject" value={subject} options={choices([...booksFor(board, level).map(b => b.subject), ...draft.subjects, subject, "Custom subject"])} disabled={busy} onChange={v => { setSubject(v); clearBook(); }} />
          <div className="space-y-2"><Label htmlFor="academic-year">Academic year</Label><Input id="academic-year" value={year} onChange={e => setYear(e.target.value)} maxLength={40} placeholder="e.g. 2026–2027" disabled={busy} /></div>
          <Choice label="Study source" value={source} options={choices([...(booksFor(board, level).length ? ["NCERT"] : []), "Upload or notes"])} disabled={busy} onChange={v => { setSource(v); clearBook(); }} />
          {subject === "Custom subject" && <div className="space-y-2"><Label htmlFor="custom-study-subject">Custom subject name</Label><Input id="custom-study-subject" onBlur={e => { if (e.target.value.trim()) setSubject(e.target.value.trim()); }} maxLength={80} /></div>}
        </div>
        {source === "NCERT" ? <>
          <div className="grid gap-4 sm:grid-cols-2"><Choice label="Textbook" value={bookId} options={books.map(b => ({ value: b.id, label: b.title }))} disabled={busy || !books.length} onChange={v => void selectBook(v)} /><Choice label="Chapter" value={chapterNumber} options={chapters.map(c => ({ value: String(c.number), label: `${c.number}. ${c.title}` }))} disabled={busy || !chapters.length} onChange={v => void selectChapter(v)} /></div>
          {!books.length && <p className="text-sm text-muted-foreground">No verified NCERT textbook is available for this selection. Choose a different subject or use uploads and notes.</p>}
          {chapterData && <div className="space-y-3 border-l-2 border-brand pl-4"><p className="text-sm font-medium">Official chapter retrieved · {chapterData.pages.length} PDF pages · {chapterData.pages.reduce((sum, p) => sum + p.text.length, 0).toLocaleString()} characters</p><a href={chapterData.url} target="_blank" rel="noreferrer" className="text-sm text-brand underline">View official chapter PDF</a><Choice label="Topic / subtopic" value={sectionId} options={[{ value: "all", label: "Complete chapter" }, ...sections.map(s => ({ value: s.id, label: `${s.id} ${s.title}` }))]} onChange={setSectionId} disabled={busy} /></div>}
        </> : <div className="space-y-4">
          {board !== "CBSE" && board !== "NCERT" && <p className="text-sm text-muted-foreground">Automatic prescribed-textbook imports for {board || "this board"} are not yet verified. Use your school’s textbook or notes.</p>}
          <div className="space-y-2"><Label htmlFor="topic-title">Topic or chapter name</Label><Input id="topic-title" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} /></div>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-ring"><FileUp className="size-5" /><span>Upload PDF, DOCX, TXT or MD · up to 10 MB</span><input type="file" className="sr-only" accept=".pdf,.docx,.txt,.md" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label>
          {file && <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm"><span className="min-w-0 break-all">{file.name}</span><Button type="button" variant="ghost" size="icon" aria-label="Remove file" title="Remove file" onClick={() => { setFile(null); setNotes(""); }}><X className="size-4" /></Button></div>}
          <div className="space-y-2"><Label htmlFor="study-notes">Study material / notes</Label><Textarea id="study-notes" rows={7} value={notes} onChange={e => { setNotes(e.target.value); if (file?.pages) setFile({ name: file.name }); }} disabled={busy} /><p className="text-right text-xs text-muted-foreground">{notes.length.toLocaleString()} / {MAX_IMPORT_CHARS.toLocaleString()} characters</p></div>
        </div>}
        {status && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{status}</p>}
        {error && <div role="alert" className="space-y-2 rounded-md bg-danger-soft p-4 text-sm text-destructive"><p>{error}</p>{source === "NCERT" && <Button type="button" variant="outline" onClick={() => { setSource("Upload or notes"); clearBook(); }}>Use upload or notes instead</Button>}</div>}
      </section>
      <details className="border-b pb-7"><summary className="flex cursor-pointer items-center gap-2 font-semibold"><Settings2 className="size-5 text-brand" /> Personalise your lesson <span className="ml-auto text-xs font-normal text-muted-foreground">{teaching.language} · {teaching.depth}</span></summary><div className="mt-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-3"><Choice label="Language" value={teaching.language} options={choices(["English", "Hindi", "Telugu", "Sanskrit", "Tamil", "Bengali", "Marathi", "Kannada", "Malayalam", teaching.language])} onChange={v => setTeaching({ ...teaching, language: v })} /><Choice label="Explanation depth" value={teaching.depth} options={choices(["Quick overview", "Standard", "Detailed teacher-style explanation"])} onChange={v => setTeaching({ ...teaching, depth: v as TeachingSettings["depth"] })} /><Choice label="Learning objective" value={teaching.objective} options={choices(["Conceptual understanding", "NCERT-focused learning", "CBSE examination preparation", "Important questions and answers", "Complete chapter preparation"])} onChange={v => setTeaching({ ...teaching, objective: v as TeachingSettings["objective"] })} /></div>
        <fieldset><legend className="mb-3 text-sm font-medium">Content sections</legend><div className="grid gap-3 sm:grid-cols-2">{CONTENT_SECTIONS.map(section => <label key={section} className="flex items-center gap-2 text-sm"><Checkbox checked={teaching.sections.includes(section)} onCheckedChange={checked => setTeaching({ ...teaching, sections: checked ? [...teaching.sections, section] : teaching.sections.filter(s => s !== section) })} />{section}</label>)}</div></fieldset>
      </div></details>
      <div className="flex flex-wrap items-end justify-between gap-4"><div className="space-y-2"><Label htmlFor="exam-date">Exam date (optional)</Label><Input id="exam-date" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} /></div><div className="flex gap-2"><Button asChild variant="ghost"><Link to="/learn">Cancel</Link></Button><Button type="submit" disabled={busy}>{saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Import & Start Learning"}</Button></div></div>
    </form>
  </div>;
}