/**
 * Zod schemas and types for AI-related inputs and outputs.
 * Used to validate both API request bodies and OpenAI responses.
 */

import { z } from "zod";

// ── API request schemas ────────────────────────────────────────────────────

export const ExtractRequestSchema = z.object({
  documentId: z.string().min(1, "documentId es requerido"),
  conventionId: z.string().min(1, "conventionId es requerido"),
});

export const ProcessDocumentRequestSchema = z.object({
  documentId: z.string().min(1, "documentId es requerido"),
});

export const SummarizeRequestSchema = z.object({
  conventionId: z.string().min(1, "conventionId es requerido"),
  tipo: z
    .enum(["ficha_tecnica", "resumen_ejecutivo"])
    .optional()
    .default("resumen_ejecutivo"),
});

export const RecommendRequestSchema = z.object({
  conventionId: z.string().min(1, "conventionId es requerido"),
});

// ── Re-export extraction schema from openai.ts ─────────────────────────────

export { ExtractionSchema, type ExtractionResult } from "@/lib/openai";

// ── Response types ─────────────────────────────────────────────────────────

export const AIOutputSchema = z.object({
  id: z.string(),
  conventionId: z.string(),
  documentId: z.string().nullable(),
  userId: z.string(),
  tipo: z.string(),
  modelo: z.string(),
  confianza: z.number().nullable(),
  camposDudosos: z.array(z.string()),
  createdAt: z.date(),
});

export type AIOutput = z.infer<typeof AIOutputSchema>;

// ── Confidence thresholds ──────────────────────────────────────────────────

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0,
} as const;

export function getConfidenceLevel(
  confianza: number
): "high" | "medium" | "low" {
  if (confianza >= CONFIDENCE_THRESHOLDS.HIGH) return "high";
  if (confianza >= CONFIDENCE_THRESHOLDS.MEDIUM) return "medium";
  return "low";
}

export function getConfidenceLabel(confianza: number): string {
  const level = getConfidenceLevel(confianza);
  return { high: "Alta confianza", medium: "Confianza media", low: "Baja confianza" }[level];
}
