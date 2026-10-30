/** Browser-side text extraction for study materials. Call only from event handlers. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_CHARS = 60000;

export async function extractText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error("File is larger than 10 MB.");
  const name = file.name.toLowerCase();
  let text = "";
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    text = await file.text();
  } else if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    text = res.value;
  } else if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= Math.min(doc.numPages, 80); i++) {
      const page = await doc.getPage(i);
      const c = await page.getTextContent();
      pages.push(c.items.map((it) => ("str" in it ? it.str : "")).join(" "));
    }
    text = pages.join("\n\n");
  } else {
    throw new Error("Unsupported file type. Use PDF, DOCX or TXT.");
  }
  text = text.replace(/\u0000/g, "").trim();
  if (!text) throw new Error("No readable text was found in this file (scanned PDFs are not supported).");
  return text.slice(0, MAX_CHARS);
}
