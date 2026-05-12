/**
 * Orchestrates local text → OpenAI (text or file) → Zod → post-processor.
 */

import { extractTextFromBuffer } from "@/lib/text-extraction";
import {
  mergeCriticalFieldRefinement,
  refineCriticalFields,
  runDocumentExtractionFromText,
  runDocumentExtractionFromBuffer,
} from "@/lib/openai-document-extraction";
import { postProcessDocumentExtraction } from "@/services/document-extraction-post-processor";
import type { DocumentExtractionRaw } from "@/validators/document-extraction.schema";
import type { NormalizedConventionPayload } from "@/validators/document-extraction.schema";
import type { ExtractionPipelineLog } from "@/validators/document-extraction.schema";

const TEXT_THRESHOLD = 50;

export type PipelineResult = {
  raw: DocumentExtractionRaw;
  normalized: NormalizedConventionPayload;
  pipeline: ExtractionPipelineLog;
  usedPath: "text" | "file";
  /** Text sent to OpenAI when path=text (for DB cache) */
  sourceTextUsed: string | null;
};

export async function runExtractionPipeline(args: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  /** If already extracted and stored, pass to skip re-parse */
  cachedText?: string | null;
}): Promise<PipelineResult> {
  let extractedText = (args.cachedText || "").trim();
  if (!extractedText) {
    extractedText = (await extractTextFromBuffer(
      args.buffer,
      args.mimeType,
      args.originalName
    )).trim();
  }

  const hasUsableText = extractedText.length >= TEXT_THRESHOLD;
  const usedPath: "text" | "file" = hasUsableText ? "text" : "file";

  console.log(
    `[extraction-pipeline] path=${usedPath} (textLen=${extractedText.length}) file="${args.originalName}"`
  );

  const run = hasUsableText
    ? await runDocumentExtractionFromText(extractedText, args.originalName)
    : await runDocumentExtractionFromBuffer(
        args.buffer,
        args.originalName,
        args.mimeType
      );

  const needsCriticalRefinement =
    run.raw.puntos_focales.length === 0 ||
    run.raw.responsabilidad_financiera.value === null;

  const refined = needsCriticalRefinement
    ? await refineCriticalFields({
        text: extractedText,
        buffer: args.buffer,
        mimeType: args.mimeType,
        filename: args.originalName,
      })
    : null;

  const mergedRaw = refined ? mergeCriticalFieldRefinement(run.raw, refined) : run.raw;
  const post = postProcessDocumentExtraction(mergedRaw);

  const pipeline: ExtractionPipelineLog = {
    path: usedPath,
    model: run.model,
    openaiLatencyMs: run.openaiLatencyMs,
    postProcessorRulesApplied: post.rulesApplied,
    postProcessorWarningsAdded: post.warningsAdded,
  };

  return {
    raw: mergedRaw,
    normalized: post.normalized,
    pipeline,
    usedPath,
    sourceTextUsed: hasUsableText ? extractedText : null,
  };
}
