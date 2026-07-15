/**
 * POST /api/ai/compare
 * Analiza con IA un grupo de instrumentos: qué se solapa, en qué se diferencian
 * y qué vacíos hay. No guarda nada: es una lectura de apoyo, no un documento.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { findConventionsByIds } from "@/repositories/convention.repository";
import { findConventionIdsWithRoadmap } from "@/repositories/roadmap.repository";
import { getOpenAIClient, OpenAIExtractionError } from "@/lib/openai";
import { INSTRUMENT_TYPE_LABELS } from "@/types";
import type { InstrumentType } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(2, "Elige al menos dos instrumentos").max(4),
});

const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    solapamientos: {
      type: "array",
      items: { type: "string" },
      description: "Qué comparten los instrumentos y qué oportunidad abre eso.",
    },
    diferencias: {
      type: "array",
      items: { type: "string" },
      description: "En qué se apartan entre sí y por qué importa.",
    },
    vacios: {
      type: "array",
      items: { type: "string" },
      description: "Qué le falta a alguno frente a los demás.",
    },
  },
  required: ["solapamientos", "diferencias", "vacios"],
  additionalProperties: false,
};

const AnalysisSchema = z.object({
  solapamientos: z.array(z.string()).default([]),
  diferencias: z.array(z.string()).default([]),
  vacios: z.array(z.string()).default([]),
});

const SYSTEM_PROMPT = `Eres analista de cooperación internacional del INDOTEL (República Dominicana).

Recibes varios instrumentos de cooperación ya firmados y debes compararlos para la dirección.

REGLAS:
- Trabaja SOLO con los datos que recibes. No inventes cláusulas, montos ni compromisos.
- Sé concreto: nombra las entidades y las áreas por su nombre, nunca hables en abstracto.
- Cada punto es una oración o dos, en español, con lenguaje ejecutivo.
- solapamientos: temas o modalidades que se repiten entre instrumentos, y qué convendría hacer con eso (por ejemplo, una actividad regional en vez de varias bilaterales).
- diferencias: en qué se apartan de forma relevante (naturaleza vinculante, renovación, preaviso, obligaciones financieras, alcance temático).
- vacios: qué le falta a alguno frente a los demás (sin punto focal, sin hoja de ruta, sin validar, por vencer sin renovación).
- Si alguna lista no aplica, devuélvela vacía. No rellenes por rellenar.
- Devuelve SOLO el JSON del esquema.`;

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const conventions = await findConventionsByIds(parsed.data.ids);
    if (conventions.length < 2) {
      return NextResponse.json(
        { error: "No se encontraron suficientes instrumentos para comparar" },
        { status: 404 }
      );
    }

    const withRoadmap = await findConventionIdsWithRoadmap(conventions.map((c) => c.id));

    const payload = conventions.map((c) => ({
      contraparte: c.contraparte,
      pais: c.pais,
      tipoInstrumento:
        INSTRUMENT_TYPE_LABELS[c.tipoInstrumento as InstrumentType] ?? c.tipoInstrumento,
      estatus: c.estatus,
      validado: c.validado,
      fechaFirma: c.fechaFirma,
      fechaVencimientoCalculada: c.fechaVencimientoCalculada,
      duracionTexto: c.duracionTexto,
      duracionMeses: c.duracionMeses,
      renovacionAutomatica: c.renovacionAutomatica,
      diasPreaviso: c.diasPreaviso,
      responsabilidadFinanciera: c.responsabilidadFinanciera,
      objetivo: c.objetivo,
      areasCooperacion: c.areasCooperacion,
      modalidadesCooperacion: c.modalidadesCooperacion,
      puntoFocal: c.puntoFocal,
      tieneHojaDeRuta: withRoadmap.has(c.id),
    }));

    const model = process.env.OPENAI_MODEL_SUMMARY || "gpt-4.1";
    const client = getOpenAIClient();

    const response = await client.responses.create({
      model,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Compara estos ${payload.length} instrumentos de cooperación de INDOTEL:\n\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ComparacionInstrumentos",
          schema: ANALYSIS_JSON_SCHEMA,
        },
      },
    });

    const analysis = AnalysisSchema.safeParse(JSON.parse(response.output_text));
    if (!analysis.success) {
      throw new OpenAIExtractionError("El análisis no cumple el formato esperado.");
    }

    return NextResponse.json({ ok: true, analysis: analysis.data, model });
  } catch (err) {
    const isAIError = err instanceof OpenAIExtractionError;
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[compare] Error:", message, err);
    return NextResponse.json(
      { error: isAIError ? message : "Error al analizar los instrumentos" },
      { status: 500 }
    );
  }
}
