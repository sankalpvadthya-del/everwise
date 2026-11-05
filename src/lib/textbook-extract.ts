import type { SourcePage } from "./curriculum";
export const MAX_IMPORT_CHARS = 120000;
/** Event-handler-only browser PDF parser, retaining page indexes and publisher labels. */
export async function extractPdfPages(bytes: Uint8Array): Promise<SourcePage[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: bytes });
  const doc = await task.promise;
  try {
    if (doc.numPages > 80) throw new Error("Choose a chapter PDF with at most 80 pages.");
    const labels = await doc.getPageLabels(); const pages: SourcePage[] = []; let chars = 0;
    for (let page = 1; page <= doc.numPages; page++) {
      const p = await doc.getPage(page); const content = await p.getTextContent();
      const lines: { y: number; x: number; text: string }[] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const x = item.transform[4] ?? 0; const y = item.transform[5] ?? 0;
        const line = lines.find(l => Math.abs(l.y - y) < 3);
        if (line) line.text += ` ${item.str}`; else lines.push({ y, x, text: item.str });
      }
      const text = lines.sort((a, b) => b.y - a.y || a.x - b.x).map(l => l.text.trim()).join("\n").replace(/\u0000/g, "");
      chars += text.length;
      if (chars > MAX_IMPORT_CHARS) throw new Error("Chapter exceeds 120,000 characters. Upload a smaller chapter or section; nothing was truncated.");
      pages.push({ page, text, ...(labels?.[page - 1] ? { label: labels[page - 1] } : {}) });
    }
    if (!pages.some(p => p.text.trim())) throw new Error("No readable text found. Scanned PDFs need a text version or manual notes.");
    return pages;
  } finally { await task.destroy(); }
}
export function decodePdf(base64: string) { return Uint8Array.from(atob(base64), c => c.charCodeAt(0)); }