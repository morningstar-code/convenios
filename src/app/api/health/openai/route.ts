/**
 * GET /api/health/openai
 *
 * Diagnostic endpoint. Checks OpenAI connectivity and returns:
 *   ok, model, latencyMs, message, and configuration details.
 *
 * Does NOT require authentication so it can be tested easily.
 * Never exposes the API key or sensitive data.
 */

import { NextResponse } from "next/server";
import { healthCheckOpenAI } from "@/lib/openai";

export const runtime = "nodejs";

export async function GET() {
  const keyConfigured = !!process.env.OPENAI_API_KEY;
  const modelExtract = process.env.OPENAI_MODEL_EXTRACT || "gpt-4.1 (default)";
  const modelSummary = process.env.OPENAI_MODEL_SUMMARY || "gpt-4.1 (default)";
  const modelRecommend = process.env.OPENAI_MODEL_RECOMMEND || "gpt-4.1 (default)";

  if (!keyConfigured) {
    return NextResponse.json(
      {
        ok: false,
        model: modelExtract,
        latencyMs: 0,
        message:
          "OPENAI_API_KEY no está configurada. Agrégala en .env.local o en el panel de variables de entorno de Vercel.",
        config: {
          keyConfigured: false,
          modelExtract,
          modelSummary,
          modelRecommend,
        },
      },
      { status: 503 }
    );
  }

  const result = await healthCheckOpenAI();

  return NextResponse.json(
    {
      ...result,
      config: {
        keyConfigured: true,
        keyPrefix: process.env.OPENAI_API_KEY!.slice(0, 12) + "…",
        modelExtract,
        modelSummary,
        modelRecommend,
      },
    },
    { status: result.ok ? 200 : 503 }
  );
}
