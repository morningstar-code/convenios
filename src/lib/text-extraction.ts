/**
 * Server-side text extraction from PDF and DOCX buffers.
 * Must run in Node.js runtime only.
 *
 * Uses createRequire for reliable CJS module loading under Next.js/Turbopack ESM.
 */

import { createRequire } from "module";

// Resolve CJS modules reliably — avoids Turbopack ESM wrapping issues
const _require = createRequire(import.meta.url);

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    return extractPdfText(buffer);
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return extractDocxText(buffer);
  }

  return `[Archivo: ${filename}]\nTipo no soportado para extracción automática de texto.`;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Use createRequire so the CJS module loads correctly under Turbopack/ESM
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse = _require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
    const data = await pdfParse(buffer);
    const text = data.text || "";
    console.log(
      `[text-extraction] PDF: ${data.numpages} pages, ${text.length} chars extracted`
    );
    return text;
  } catch (err) {
    console.error("[text-extraction] PDF extraction failed:", err);
    return "";
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const mammoth = _require("mammoth") as {
      extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
    };
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || "";
    console.log(`[text-extraction] DOCX: ${text.length} chars extracted`);
    return text;
  } catch (err) {
    console.error("[text-extraction] DOCX extraction failed:", err);
    return "";
  }
}
