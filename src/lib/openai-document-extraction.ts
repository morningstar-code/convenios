/**
 * OpenAI Responses API — evidence-based document extraction (v2).
 * Server-side only.
 */

import OpenAI from "openai";
import {
  getOpenAIClient,
  OpenAIExtractionError,
  OpenAIConfigError,
} from "@/lib/openai";
import { DOCUMENT_EXTRACTION_JSON_SCHEMA } from "@/lib/document-extraction-json-schema";
import { DIRECCIONES_PROMPT_BLOCK } from "@/lib/indotel-org";
import {
  coerceDocumentExtractionRaw,
  emptyBooleanField,
  type DocumentExtractionRaw,
  type StringListItem,
} from "@/validators/document-extraction.schema";

const DEFAULT_MODEL = "gpt-4.1";

function extractModel(): string {
  return process.env.OPENAI_MODEL_EXTRACT || DEFAULT_MODEL;
}

function criticalExtractModel(): string {
  return process.env.OPENAI_MODEL_EXTRACT_CRITICAL || extractModel();
}

function toUserMessage(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 401) return "API key inválida o no autorizada.";
    if (err.status === 429) {
      if (err.message.includes("quota") || err.message.includes("exceeded"))
        return "Cuota de OpenAI agotada.";
      return "Límite de solicitudes alcanzado.";
    }
    if (err.status === 503 || err.status === 529)
      return "Servicio de OpenAI temporalmente no disponible.";
    return `Error de OpenAI (${err.status}): ${err.message}`;
  }
  if (err instanceof OpenAIConfigError) return err.message;
  if (err instanceof Error) return err.message;
  return "Error desconocido al contactar OpenAI.";
}

const DOCUMENT_EXTRACTION_SYSTEM_PROMPT = `Eres un extractor documental jurídico e institucional. Analizas convenios, acuerdos, memorandos de entendimiento y documentos afines entre instituciones públicas o reguladoras.

PRIORIDAD: precisión documental y verificabilidad. No inventes datos. No completes por suposición.
Si un dato no puede determinarse con seguridad desde el texto o el archivo, devuelve value: null y confidence baja.

EVIDENCIA (obligatoria para campos críticos cuando exista soporte en el documento):
- Para cada campo con objeto { value, confidence, evidence }:
  - evidence.text: cita breve literal o casi literal del documento (máx. ~400 caracteres).
  - evidence.page: número de página si lo infieres; si no aplica (p. ej. solo texto plano), null.

DISTINCIONES OBLIGATORIAS:
- Parte principal / institución propia vs. contraparte(s): separa en parte_principal y contrapartes[].
- Firmantes (secciones "Firmas", "Signatures", "Firman", etc.) → firmantes[]. NO uses firmantes como puntos_focales.
- Puntos focales / contacto operativo (secciones "Punto focal", "Puntos de contacto", "Contact persons", "Focal points", etc.) → puntos_focales[].
- CRÍTICO: en puntos_focales[] devuelve SOLAMENTE el contacto operativo de la institución propia / parte_principal (INDOTEL). NO incluyas contactos de la contraparte.
- Si el documento muestra contactos de ambas partes y no puedes distinguir cuál corresponde a INDOTEL con seguridad, devuelve puntos_focales[] vacío y añade "punto_focal" a campos_dudosos.
- Objetivo vs. actividades vs. áreas: objetivo = finalidad general; actividades = acciones concretas; areas_cooperacion = temas o ejes temáticos.

VIGENCIA:
- Si el instrumento permanece vigente hasta notificación de terminación o sin plazo fijo, vigencia_tipo.value debe reflejar indefinida/abierta y duracion_meses.value = null, fecha_vencimiento_calculada.value = null.
- Si hay plazo fijo en meses/años, extrae duracion_meses o duracion_texto con evidencia.
- dias_preaviso: solo si hay antelación explícita en días (evidencia).
- condicion_terminacion: no la resumas solo como "sin vencimiento fijo". Si el documento indica cómo cesa/cancela el instrumento, incluye también el mecanismo: notificación, denuncia, terminación por acuerdo mutuo o preaviso, y menciona los días cuando existan.

FINANCIERO:
- Si el documento establece que no hay erogaciones, no hay transferencias de fondos o no crea compromisos financieros, responsabilidad_financiera.value = false con evidencia.
- Si no hay cláusula clara, null y añade el campo a campos_dudosos o warnings.

PAÍSES:
- paises_relacionados[]: países de las partes o del alcance geográfico, con evidencia cuando sea posible.

MULTIPARTES:
- contrapartes[] puede tener varias entradas. No mezcles en un solo campo sin listar.

SALIDA:
- Devuelve ÚNICAMENTE el JSON que cumple el esquema solicitado (structured output).
- confianza_extraccion_global: 0–1 según claridad global del documento.
- campos_dudosos: nombres lógicos de campos ambiguos.
- warnings: mensajes breves (p. ej. evidencia contradictoria, secciones ausentes).

No generes narrativa libre fuera del JSON.

${DIRECCIONES_PROMPT_BLOCK}`;

const CRITICAL_FIELDS_SYSTEM_PROMPT = `Eres un revisor experto de campos críticos en convenios de INDOTEL.

OBJETIVO:
- Revisar SOLAMENTE dos campos: puntos_focales[] y responsabilidad_financiera.
- La institución propia del sistema es INDOTEL. Si el documento muestra contactos de varias partes, quédate únicamente con el contacto operativo de INDOTEL.

PUNTO FOCAL / CONTACTO:
- Busca secciones como "punto focal", "punto de contacto", "contacto", "contact person", "focal point", "por el INSTITUTO DOMINICANO DE LAS TELECOMUNICACIONES", "por INDOTEL".
- NO uses firmantes como contacto operativo salvo que el documento los identifique explícitamente como punto focal o contacto.
- Si aparecen contactos de ambas partes, devuelve SOLO el de INDOTEL en puntos_focales[].
- Si no puedes distinguir con seguridad cuál es el de INDOTEL, devuelve puntos_focales[] vacío y agrega "punto_focal" a campos_dudosos.
- Cada item de puntos_focales[] debe incluir value, confidence y evidence.

RESPONSABILIDAD FINANCIERA:
- Lee el documento COMPLETO antes de decidir. No te detengas en las primeras páginas.
- responsabilidad_financiera.value = true cuando el documento mencione CUALQUIERA de: pagos, costos, gastos, aportes, montos, importes, transferencias, presupuesto, viáticos, reembolsos, contribuciones, francos suizos (CHF), USD, EUR, cuenta bancaria, IBAN, SWIFT, o que una parte abonará/pagará/cubrirá importes a la otra.
- responsabilidad_financiera.value = true TAMBIÉN si cada parte asume sus propios gastos (eso ES responsabilidad financiera).
- responsabilidad_financiera.value = false SOLO cuando el documento diga EXPLÍCITAMENTE que NO hay obligaciones financieras, NO hay erogaciones, NO hay transferencias de fondos.
- responsabilidad_financiera.value = null si el documento no es claro.
- IMPORTANTE: si encuentras cláusulas de pago (como "abonará", "importe de X CHF", "cuenta bancaria") AUNQUE sea en anexos o secciones posteriores, el valor DEBE ser true.
- Siempre incluye evidence.text copiando el párrafo relevante del documento.
- Si el documento es ambiguo, agrega "responsabilidad_financiera" a campos_dudosos.

SALIDA:
- Devuelve SOLO JSON válido.
- No inventes datos.
- Si no hay evidencia suficiente, deja value en null o lista vacía.`;

function fieldString(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      value: { type: ["string", "null"] },
      confidence: { type: "number" },
      evidence: {
        anyOf: [
          {
            type: "object",
            properties: {
              page: { type: ["integer", "null"] },
              text: { type: ["string", "null"] },
            },
            required: ["page", "text"],
            additionalProperties: false,
          },
          { type: "null" },
        ],
      },
    },
    required: ["value", "confidence", "evidence"],
    additionalProperties: false,
  };
}

function fieldBoolean(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      value: { type: ["boolean", "null"] },
      confidence: { type: "number" },
      evidence: {
        anyOf: [
          {
            type: "object",
            properties: {
              page: { type: ["integer", "null"] },
              text: { type: ["string", "null"] },
            },
            required: ["page", "text"],
            additionalProperties: false,
          },
          { type: "null" },
        ],
      },
    },
    required: ["value", "confidence", "evidence"],
    additionalProperties: false,
  };
}

const CRITICAL_FIELDS_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    puntos_focales: { type: "array", items: fieldString() },
    responsabilidad_financiera: fieldBoolean(),
    campos_dudosos: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "puntos_focales",
    "responsabilidad_financiera",
    "campos_dudosos",
    "warnings",
  ],
  additionalProperties: false,
};

export type CriticalFieldRefinement = {
  puntos_focales: StringListItem[];
  responsabilidad_financiera: DocumentExtractionRaw["responsabilidad_financiera"];
  campos_dudosos: string[];
  warnings: string[];
  model: string;
};

export type ExtractionRunResult = {
  raw: DocumentExtractionRaw;
  openaiLatencyMs: number;
  model: string;
};

export async function runDocumentExtractionFromText(
  text: string,
  filename?: string
): Promise<ExtractionRunResult> {
  const client = getOpenAIClient();
  const model = extractModel();
  const truncated = text.slice(0, 28_000);
  const start = Date.now();

  console.log(
    `[openai-doc-extract] TEXT path — model=${model}, chars=${truncated.length}`
  );

  let outputText: string;
  try {
    const response = await client.responses.create({
      model,
      input: [
        { role: "system", content: DOCUMENT_EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Contexto adicional: la institución propia que debes priorizar es INDOTEL.${filename ? ` Archivo: ${filename}.` : ""}\n\nAnaliza el siguiente documento y extrae el JSON según las reglas:\n\n${truncated}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "DocumentExtractionV2",
          schema: DOCUMENT_EXTRACTION_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });
    outputText = response.output_text;
  } catch (err) {
    console.error("[openai-doc-extract] API error:", err);
    throw new OpenAIExtractionError(toUserMessage(err));
  }

  const openaiLatencyMs = Date.now() - start;
  console.log(`[openai-doc-extract] TEXT done — ${openaiLatencyMs}ms`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    console.error("[openai-doc-extract] Invalid JSON:", outputText?.slice(0, 500));
    throw new OpenAIExtractionError("Respuesta del modelo no es JSON válido.");
  }

  const raw = coerceDocumentExtractionRaw(parsed);
  return { raw, openaiLatencyMs, model };
}

export async function runDocumentExtractionFromBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ExtractionRunResult> {
  const client = getOpenAIClient();
  const model = extractModel();
  const start = Date.now();
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  console.log(
    `[openai-doc-extract] FILE path — model=${model}, file="${filename}", ${(buffer.length / 1024).toFixed(0)} KB`
  );

  let outputText: string;
  try {
    const response = await client.responses.create({
      model,
      input: [
        { role: "system" as const, content: DOCUMENT_EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user" as const,
          content: [
            {
              type: "input_file" as const,
              filename,
              file_data: dataUrl,
            },
            {
              type: "input_text" as const,
              text: "La institución propia que debes priorizar es INDOTEL. Analiza el documento adjunto y devuelve el JSON de extracción según las reglas del sistema.",
            },
          ],
        },
      ] as Parameters<typeof client.responses.create>[0]["input"],
      text: {
        format: {
          type: "json_schema",
          name: "DocumentExtractionV2",
          schema: DOCUMENT_EXTRACTION_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });
    outputText = response.output_text;
  } catch (err) {
    console.error("[openai-doc-extract] FILE API error:", err);
    if (
      err instanceof OpenAI.APIError &&
      (err.status === 400 || err.message.includes("file"))
    ) {
      const { extractTextFromBuffer } = await import("@/lib/text-extraction");
      const t = await extractTextFromBuffer(buffer, mimeType, filename);
      if (t.trim().length >= 50) {
        console.warn("[openai-doc-extract] Falling back to TEXT path after file error");
        return runDocumentExtractionFromText(t, filename);
      }
    }
    throw new OpenAIExtractionError(toUserMessage(err));
  }

  const openaiLatencyMs = Date.now() - start;
  console.log(`[openai-doc-extract] FILE done — ${openaiLatencyMs}ms`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    console.error("[openai-doc-extract] Invalid JSON (file):", outputText?.slice(0, 500));
    throw new OpenAIExtractionError("Respuesta del modelo no es JSON válido.");
  }

  const raw = coerceDocumentExtractionRaw(parsed);
  return { raw, openaiLatencyMs, model };
}

async function runCriticalFieldRefinementFromText(
  text: string,
  filename?: string
): Promise<CriticalFieldRefinement> {
  const client = getOpenAIClient();
  const model = criticalExtractModel();
  const truncated = text.slice(0, 28_000);

  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: CRITICAL_FIELDS_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Contexto adicional: la institución propia que debes priorizar es INDOTEL.${filename ? ` Archivo: ${filename}.` : ""}\n\nRevisa exclusivamente estos campos críticos del documento:\n\n${truncated}`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "CriticalFieldRefinement",
        schema: CRITICAL_FIELDS_JSON_SCHEMA,
      },
    },
  });

  const parsed = JSON.parse(response.output_text) as Omit<CriticalFieldRefinement, "model">;
  return { ...parsed, model };
}

async function runCriticalFieldRefinementFromBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<CriticalFieldRefinement> {
  const client = getOpenAIClient();
  const model = criticalExtractModel();
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  const response = await client.responses.create({
    model,
    input: [
      { role: "system" as const, content: CRITICAL_FIELDS_SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: [
          {
            type: "input_file" as const,
            filename,
            file_data: dataUrl,
          },
          {
            type: "input_text" as const,
            text: "La institución propia que debes priorizar es INDOTEL. Revisa solo puntos focales y responsabilidad financiera.",
          },
        ],
      },
    ] as Parameters<typeof client.responses.create>[0]["input"],
    text: {
      format: {
        type: "json_schema",
        name: "CriticalFieldRefinement",
        schema: CRITICAL_FIELDS_JSON_SCHEMA,
      },
    },
  });

  const parsed = JSON.parse(response.output_text) as Omit<CriticalFieldRefinement, "model">;
  return { ...parsed, model };
}

export async function refineCriticalFields(args: {
  text?: string | null;
  buffer?: Buffer;
  mimeType?: string;
  filename: string;
}): Promise<CriticalFieldRefinement> {
  if (args.buffer && args.mimeType) {
    try {
      // Prefer full-file analysis to cover the complete PDF.
      return await runCriticalFieldRefinementFromBuffer(
        args.buffer,
        args.filename,
        args.mimeType
      );
    } catch (err) {
      console.error("[openai-doc-extract] critical refinement FILE error:", err);
    }
  }

  if (args.text && args.text.trim().length >= 50) {
    try {
      return await runCriticalFieldRefinementFromText(args.text, args.filename);
    } catch (err) {
      console.error("[openai-doc-extract] critical refinement TEXT error:", err);
    }
  }

  return {
    puntos_focales: [],
    responsabilidad_financiera: emptyBooleanField(),
    campos_dudosos: [],
    warnings: [],
    model: criticalExtractModel(),
  };
}

export function mergeCriticalFieldRefinement(
  raw: DocumentExtractionRaw,
  refined: CriticalFieldRefinement
): DocumentExtractionRaw {
  return {
    ...raw,
    puntos_focales:
      refined.puntos_focales.length > 0 ? refined.puntos_focales : raw.puntos_focales,
    responsabilidad_financiera:
      refined.responsabilidad_financiera.value !== null
        ? refined.responsabilidad_financiera
        : raw.responsabilidad_financiera,
    campos_dudosos: [...new Set([...raw.campos_dudosos, ...refined.campos_dudosos])],
    warnings: [...new Set([...raw.warnings, ...refined.warnings])],
  };
}
