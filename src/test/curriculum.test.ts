import { describe, it, expect } from "vitest";
import { booksFor, officialPdfUrl, approvedSourceUrl, chaptersFromContents, sectionsFromPages, sourceChunks, teachingFromMetadata, teachingSchema, DEFAULT_TEACHING } from "@/lib/curriculum";

describe("curriculum integrity", () => {
  it("maps CBSE Class 10 Science to the actual NCERT book", () => {
    expect(booksFor("CBSE", "Class 10", "Science").find(b => b.id === "jesc1")).toMatchObject({ title: "Science", chapterCount: 13 });
    expect(officialPdfUrl("jesc1", 1)).toBe("https://ncert.nic.in/textbook/pdf/jesc101.pdf");
  });
  it("never offers NCERT as an unverified prescribed ICSE or State Board curriculum", () => {
    expect(booksFor("ICSE", "Class 10", "Science")).toEqual([]);
    expect(booksFor("State Board", "Class 10", "Science")).toEqual([]);
  });
  it("uses distinct subjects for higher classes", () => {
    expect(booksFor("CBSE", "Class 11", "Science")).toEqual([]);
    expect(booksFor("CBSE", "Class 11", "Physics").length).toBeGreaterThan(0);
  });
  it("rejects arbitrary source domains, URLs and nonexistent chapter IDs", () => {
    expect(approvedSourceUrl("https://ncert.nic.in/textbook/pdf/jesc101.pdf")).toBe(true);
    for (const url of ["http://ncert.nic.in/textbook/pdf/jesc101.pdf", "https://ncert.nic.in.evil.test/textbook/pdf/jesc101.pdf", "https://user@ncert.nic.in/textbook/pdf/jesc101.pdf", "https://ncert.nic.in/textbook/pdf/jesc101.pdf?next=localhost"]) expect(approvedSourceUrl(url)).toBe(false);
    expect(() => officialPdfUrl("unknown", 1)).toThrow();
    expect(() => officialPdfUrl("jesc1", 14)).toThrow();
  });
  it("extracts only chapter titles actually present in contents", () => {
    const chapters = chaptersFromContents([{ page: 11, text: "CONTENTS\nChapter 1 Chemical Reactions and Equations 1\nChapter 2 Acids, Bases and Salts 17\n" }]);
    expect(chapters).toEqual([{ number: 1, title: "Chemical Reactions and Equations" }, { number: 2, title: "Acids, Bases and Salts" }]);
    expect(chaptersFromContents([{ page: 1, text: "Missing contents" }])).toEqual([]);
  });
  it("preserves chapter endings beyond the old 24000 character limit", () => {
    const text = "A".repeat(26000) + "LATE_CHAPTER_CONCEPT";
    const chunks = sourceChunks(text, {});
    expect(chunks.map(c => c.text).join("")).toBe(text);
    expect(chunks.at(-1)?.text).toContain("LATE_CHAPTER_CONCEPT");
  });
  it("keeps PDF page indexes distinct from supplied publisher page labels", () => {
    const chunks = sourceChunks("text", { textbook: "Science", chapter: "Chemical Reactions", pages: [{ page: 2, label: "17", text: "Acid concept" }] });
    expect(chunks[0]?.reference).toContain("PDF page 2 (publisher label 17)");
  });
  it("extracts real numbered subtopics with correct source boundaries", () => {
    const sections = sectionsFromPages([{ page: 1, text: "1.1 CHEMICAL EQUATIONS\nBalance atoms.\n1.2 TYPES OF CHEMICAL REACTIONS\nCombination." }]);
    expect(sections.map(s => s.id)).toEqual(["1.1", "1.2"]);
    expect(sections[0]?.end).toBe(sections[1]?.start);
  });
  it("uses bounded teaching settings and preserves defaults for legacy topics", () => {
    expect(teachingFromMetadata({})).toEqual(DEFAULT_TEACHING);
    expect(teachingSchema.safeParse({ ...DEFAULT_TEACHING, sections: [] }).success).toBe(false);
    expect(teachingFromMetadata({ teaching: { ...DEFAULT_TEACHING, language: "Telugu" } }).language).toBe("Telugu");
  });
});