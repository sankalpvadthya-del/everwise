import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { officialPdfUrl, approvedSourceUrl } from "./curriculum";

/** Registry-owned URLs only; no arbitrary URL input or redirects. PDF parsing stays in the browser. */
export const retrieveTextbook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; chapter: number | "contents" }) => z.object({ bookId: z.string().max(30), chapter: z.union([z.literal("contents"), z.number().int().positive()]) }).parse(input))
  .handler(async ({ data }) => {
    const url = officialPdfUrl(data.bookId, data.chapter);
    if (!approvedSourceUrl(url)) throw new Error("Source is not approved.");
    try {
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error(`NCERT download failed (${response.status}).`);
      const maxBytes = 10 * 1024 * 1024;
      if (Number(response.headers.get("content-length")) > maxBytes) throw new Error("Textbook PDF exceeds the 10 MB import limit.");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("The textbook download is empty.");
      const parts: Uint8Array[] = []; let size = 0;
      while (true) {
        const item = await reader.read(); if (item.done) break;
        size += item.value.length;
        if (size > maxBytes) { await reader.cancel(); throw new Error("Textbook PDF exceeds the 10 MB import limit."); }
        parts.push(item.value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const part of parts) { bytes.set(part, offset); offset += part.length; }
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("NCERT returned a page rather than a readable PDF.");
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return { base64: btoa(binary), url, retrievedAt: new Date().toISOString() };
    } catch (error) {
      console.error("official textbook retrieval", error instanceof Error ? error.message : "download failed");
      throw new Error("The official textbook could not be downloaded. Try again, upload your textbook PDF, or paste notes. No NCERT content has been imported.");
    }
  });