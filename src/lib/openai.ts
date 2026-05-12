/**
 * Centralized OpenAI service — server-side ONLY.
 *
 * All functions in this module MUST be called from Route Handlers or
 * Server Actions with `runtime = "nodejs"`. Never import in client components.
 *
 * Uses the OpenAI Responses API throughout.
 *
 * Model defaults (overridden by environment variables):
 *   OPENAI_MODEL_EXTRACT   – extraction of structured fields
 *   OPENAI_MODEL_SUMMARY   – ficha técnica + resumen ejecutivo
 *   OPENAI_MODEL_RECOMMEND – recomendación preliminar
 */

import OpenAI from "openai";
import { z } from "zod";
import { normalizeFichaDuracionCell } from "@/lib/utils";
import { sanitizeFichaConvenio } from "@/lib/ficha-utils";

// ─────────────────────────────────────────────────────────────────────────────
// Client factory
// ─────────────────────────────────────────────────────────────────────────────

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new OpenAIConfigError(
      "OPENAI_API_KEY no está configurada. " +
        "Agrega la variable de entorno en .env.local (desarrollo) o en el panel de Vercel (producción)."
    );
  }
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 90_000,    // 90 s — generous for long documents
      maxRetries: 2,
    });
  }
  return _client;
}

export class OpenAIConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIConfigError";
  }
}

export class OpenAIExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIExtractionError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Model resolution
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "gpt-4.1";

function models() {
  return {
    extract: process.env.OPENAI_MODEL_EXTRACT || DEFAULT_MODEL,
    summary: process.env.OPENAI_MODEL_SUMMARY || DEFAULT_MODEL,
    recommend: process.env.OPENAI_MODEL_RECOMMEND || DEFAULT_MODEL,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction schema (Zod)
// ─────────────────────────────────────────────────────────────────────────────

export const ExtractionSchema = z.object({
  tipo_instrumento: z
    .enum([
      "convenio_marco",
      "convenio_especifico",
      "memorando_entendimiento",
      "acuerdo_cooperacion",
      "protocolo",
      "declaracion_conjunta",
      "otro",
    ])
    .nullable(),
  contraparte: z.string().nullable(),
  pais: z.string().nullable(),
  fecha_firma: z
    .string()
    .nullable()
    .describe("Fecha en formato ISO YYYY-MM-DD o null"),
  duracion_texto: z.string().nullable(),
  duracion_meses: z.number().int().nullable(),
  estatus: z.enum(["vigente", "cancelado"]).nullable(),
  condicion_terminacion: z.string().nullable(),
  dias_preaviso: z.number().int().nullable(),
  punto_focal: z.string().nullable(),
  cargo_punto_focal: z.string().nullable(),
  correo_punto_focal: z.string().nullable(),
  direcciones_involucradas: z.array(z.string()).default([]),
  objetivo: z.string().nullable(),
  modalidades_cooperacion: z.array(z.string()).default([]),
  areas_cooperacion: z.array(z.string()).default([]),
  impacto_esperado: z.string().nullable(),
  responsabilidad_financiera: z.boolean().nullable(),
  monto_referencial: z.number().nullable(),
  observaciones: z.string().nullable(),
  confianza_extraccion: z.number().min(0).max(1),
  campos_dudosos: z.array(z.string()).default([]),
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// JSON schema for OpenAI Responses API
//
// NOTE: We intentionally omit `strict: true` here.
// OpenAI strict mode does NOT support nullable enum values
// (type: ["string","null"] + enum). We validate with Zod after the call.
// ─────────────────────────────────────────────────────────────────────────────

const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    tipo_instrumento: {
      type: ["string", "null"],
      enum: [
        "convenio_marco",
        "convenio_especifico",
        "memorando_entendimiento",
        "acuerdo_cooperacion",
        "protocolo",
        "declaracion_conjunta",
        "otro",
        null,
      ],
    },
    contraparte:              { type: ["string", "null"] },
    pais:                     { type: ["string", "null"] },
    fecha_firma:              { type: ["string", "null"] },
    duracion_texto:           { type: ["string", "null"] },
    duracion_meses:           { type: ["integer", "null"] },
    estatus: {
      type: ["string", "null"],
      enum: ["vigente", "cancelado", null],
    },
    condicion_terminacion:    { type: ["string", "null"] },
    dias_preaviso:            { type: ["integer", "null"] },
    punto_focal:              { type: ["string", "null"] },
    cargo_punto_focal:        { type: ["string", "null"] },
    correo_punto_focal:       { type: ["string", "null"] },
    direcciones_involucradas: { type: "array", items: { type: "string" } },
    objetivo:                 { type: ["string", "null"] },
    modalidades_cooperacion:  { type: "array", items: { type: "string" } },
    areas_cooperacion:        { type: "array", items: { type: "string" } },
    impacto_esperado:         { type: ["string", "null"] },
    responsabilidad_financiera: { type: ["boolean", "null"] },
    monto_referencial:        { type: ["number", "null"] },
    observaciones:            { type: ["string", "null"] },
    confianza_extraccion: {
      type: "number",
      description: "Número entre 0 y 1. 1.0 = altísima confianza.",
    },
    campos_dudosos: {
      type: "array",
      items: { type: "string" },
      description: "Nombres de campos donde hubo ambigüedad.",
    },
  },
  required: [
    "tipo_instrumento", "contraparte", "pais", "fecha_firma",
    "duracion_texto", "duracion_meses", "estatus", "condicion_terminacion",
    "dias_preaviso", "punto_focal", "cargo_punto_focal", "correo_punto_focal",
    "direcciones_involucradas", "objetivo", "modalidades_cooperacion",
    "areas_cooperacion", "impacto_esperado", "responsabilidad_financiera",
    "monto_referencial", "observaciones", "confianza_extraccion", "campos_dudosos",
  ],
  additionalProperties: false,
};

const EXTRACTION_SYSTEM_PROMPT = `Eres un asistente especializado en análisis de convenios y acuerdos internacionales para una institución pública latinoamericana.
Tu única tarea es extraer información estructurada de documentos legales de cooperación internacional.

REGLAS CRÍTICAS — debes seguirlas siempre:
- NUNCA inventes datos que no estén explícitamente en el documento.
- Usa null cuando la información no exista o no puedas inferirla con seguridad.
- Si hay ambigüedad sobre un campo, inclúyelo en campos_dudosos Y usa null o el valor más probable.
- duracion_meses debe ser null si la duración es indefinida, permanente o no cuantificable.
- pais debe ser el país de la contraparte extranjera, en español. null si no se puede determinar con certeza.
- dias_preaviso debe ser null si no se menciona explícitamente o no puede calcularse.
- fecha_firma en formato ISO YYYY-MM-DD o null.
- confianza_extraccion: 0.9–1.0 = datos muy claros y completos; 0.6–0.8 = algunos campos inciertos; 0.0–0.5 = document incompleto o confuso.
- Devuelve SOLO el JSON estructurado, sin texto adicional, sin markdown, sin explicaciones.`;

// ─────────────────────────────────────────────────────────────────────────────
// extractConventionFieldsFromText
// ─────────────────────────────────────────────────────────────────────────────

export async function extractConventionFieldsFromText(
  text: string
): Promise<ExtractionResult> {
  const client = getOpenAIClient();
  const model = models().extract;

  // Truncate to avoid excessive token usage (≈ 12 000 chars ≈ 3 000 tokens)
  const truncated = text.slice(0, 14_000);

  console.log(
    `[openai] extractConventionFieldsFromText — model: ${model}, chars: ${truncated.length}`
  );

  let rawText: string;

  try {
    const response = await client.responses.create({
      model,
      input: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extrae la información estructurada del siguiente documento de convenio:\n\n${truncated}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ConventionExtraction",
          schema: EXTRACTION_JSON_SCHEMA,
          // strict: true is deliberately omitted — nullable enums are not
          // supported by OpenAI strict mode. We validate with Zod instead.
        },
      },
    });

    rawText = response.output_text;
  } catch (err) {
    const msg = toUserMessage(err);
    console.error(`[openai] extraction API error: ${msg}`, err);
    throw new OpenAIExtractionError(`Error al llamar a OpenAI: ${msg}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error(`[openai] extraction: invalid JSON from model:\n${rawText}`);
    throw new OpenAIExtractionError(
      "El modelo devolvió una respuesta inválida. Intenta procesar el documento nuevamente."
    );
  }

  const result = ExtractionSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[openai] extraction: Zod validation failed", result.error.issues);
    // Attempt a lenient parse so we don't lose all data
    const lenient = ExtractionSchema.partial().safeParse(parsed);
    if (lenient.success) {
      // Return with defaults for missing fields
      return ExtractionSchema.parse({
        tipo_instrumento: null,
        contraparte: null,
        pais: null,
        fecha_firma: null,
        duracion_texto: null,
        duracion_meses: null,
        estatus: null,
        condicion_terminacion: null,
        dias_preaviso: null,
        punto_focal: null,
        cargo_punto_focal: null,
        correo_punto_focal: null,
        direcciones_involucradas: [],
        objetivo: null,
        modalidades_cooperacion: [],
        areas_cooperacion: [],
        impacto_esperado: null,
        responsabilidad_financiera: null,
        monto_referencial: null,
        observaciones: null,
        confianza_extraccion: 0.1,
        campos_dudosos: ["validación_fallida"],
        ...lenient.data,
      });
    }
    throw new OpenAIExtractionError(
      "El resultado de la extracción no cumple el formato esperado."
    );
  }

  console.log(
    `[openai] extraction done — confianza: ${result.data.confianza_extraccion}, ` +
      `campos_dudosos: [${result.data.campos_dudosos.join(", ")}]`
  );

  return result.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// extractConventionFieldsFromBuffer
//
// Sends the raw file directly to OpenAI using the file input feature.
// This handles:
//   - Text-based PDFs (OpenAI reads the text layer)
//   - Scanned/image PDFs (OpenAI uses vision to read the image)
//   - DOCX files
//
// Use this as the primary extraction method for real documents.
// ─────────────────────────────────────────────────────────────────────────────

export async function extractConventionFieldsFromBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ExtractionResult> {
  const client = getOpenAIClient();
  const model = models().extract;

  console.log(
    `[openai] extractConventionFieldsFromBuffer — model: ${model}, ` +
      `file: "${filename}", size: ${(buffer.length / 1024).toFixed(0)} KB`
  );

  // Encode file as base64 data URL for OpenAI file input
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  let rawText: string;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system" as const,
          content: EXTRACTION_SYSTEM_PROMPT,
        },
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
              text: "Extrae la información estructurada de este convenio de cooperación internacional según las reglas indicadas.",
            },
          ],
        },
      ] as Parameters<typeof client.responses.create>[0]["input"],
      text: {
        format: {
          type: "json_schema",
          name: "ConventionExtraction",
          schema: EXTRACTION_JSON_SCHEMA,
        },
      },
    });

    rawText = response.output_text;
  } catch (err) {
    const msg = toUserMessage(err);
    console.error(`[openai] file extraction API error: ${msg}`, err);

    // If file input fails (e.g., model doesn't support it), try text fallback
    if (
      err instanceof OpenAI.APIError &&
      (err.status === 400 || err.message.includes("file"))
    ) {
      console.warn("[openai] File input not supported, falling back to text extraction from buffer");
      // Import text extraction here to avoid circular deps
      const { extractTextFromBuffer } = await import("./text-extraction");
      const extractedText = await extractTextFromBuffer(buffer, mimeType, filename);
      if (extractedText && extractedText.trim().length >= 20) {
        return extractConventionFieldsFromText(extractedText);
      }
    }

    throw new OpenAIExtractionError(`Error al procesar el archivo con IA: ${msg}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error(`[openai] file extraction: invalid JSON:\n${rawText}`);
    throw new OpenAIExtractionError(
      "El modelo devolvió una respuesta inválida al procesar el archivo."
    );
  }

  const result = ExtractionSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[openai] file extraction: Zod validation failed", result.error.issues);
    // Lenient fallback
    const lenient = ExtractionSchema.partial().safeParse(parsed);
    if (lenient.success) {
      return ExtractionSchema.parse({
        tipo_instrumento: null,
        contraparte: null,
        pais: null,
        fecha_firma: null,
        duracion_texto: null,
        duracion_meses: null,
        estatus: null,
        condicion_terminacion: null,
        dias_preaviso: null,
        punto_focal: null,
        cargo_punto_focal: null,
        correo_punto_focal: null,
        direcciones_involucradas: [],
        objetivo: null,
        modalidades_cooperacion: [],
        areas_cooperacion: [],
        impacto_esperado: null,
        responsabilidad_financiera: null,
        monto_referencial: null,
        observaciones: null,
        confianza_extraccion: 0.1,
        campos_dudosos: ["validación_fallida"],
        ...lenient.data,
      });
    }
    throw new OpenAIExtractionError(
      "El resultado de la extracción no cumple el formato esperado."
    );
  }

  console.log(
    `[openai] file extraction done — confianza: ${result.data.confianza_extraccion}, ` +
      `campos_dudosos: [${result.data.campos_dudosos.join(", ")}]`
  );

  return result.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// generateConventionFicha — genera ficha del convenio como JSON estructurado
// ─────────────────────────────────────────────────────────────────────────────

export interface FichaConvenio {
  nombreDocumento: string;
  tipoInstrumento: string;
  fechaFirma: string;
  duracion: string;
  estatus: string;
  condicionTerminacion: string;
  puntoFocal: string;
  direccionesInvolucradas: string;
  enlace: string;
  objetivo: string;
  modalidadesCooperacion: string;
  actividades: string;
  areasCooperacion: string;
  temasSugeridos: string;
  responsabilidadFinanciera: string;
  impactoEsperado: string;
  conclusion: string;
}

const INDEFINITE_DURATION_PATTERNS = [
  /vigencia\s+indefinida/i,
  /duraci[oó]n\s+indefinida/i,
  /plazo\s+indefinido/i,
  /sin\s+plazo\s+(?:fijo|determinado)/i,
  /sin\s+vencimiento\s+fijo/i,
  /permanecer[aá]\s+en\s+vigor/i,
  /permanecer[aá]\s+vigente/i,
  /hasta\s+que\s+sea\s+terminado/i,
  /hasta\s+que\s+(?:una|cualquiera)\s+de\s+las\s+partes/i,
];

const NOTICE_DURATION_PATTERNS = [
  /\baviso\s+por\s+escrito\b/i,
  /\bpreaviso\b/i,
  /\bantelaci[oó]n\b/i,
  /\bnotificaci[oó]n\b/i,
  /\bdar\s+por\s+terminado\b/i,
  /\bterminad[oa]\s+por\b/i,
];

function normFichaValue(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readFichaContextValue(
  conventionData: Record<string, unknown>,
  key: string
): string {
  const value = conventionData[key];
  return typeof value === "string" ? value.trim() : "";
}

function stripFileExtension(filename: string): string {
  return filename.replace(/\.(pdf|docx?|rtf)$/i, "").trim();
}

export function choosePreferredDocumentName(
  modelDocumentName: string,
  conventionData: Record<string, unknown>
): string {
  const baseDocumentName = readFichaContextValue(conventionData, "documentoBase");
  if (baseDocumentName) return stripFileExtension(baseDocumentName);

  const extractedTitle = readFichaContextValue(conventionData, "nombreConvenio");
  if (extractedTitle) return extractedTitle;

  const cleanedModelName = (modelDocumentName || "").trim();
  if (cleanedModelName) return cleanedModelName;

  return "[Dato no disponible en el documento]";
}

const FINANCIAL_POSITIVE_SIGNALS =
  /abonar|pagara|pagar|pago|importe|costo|gasto|transferencia|financiamiento|presupuesto|viatico|reembolso|aporte|erogacion|cuenta bancaria|iban|swift|chf|usd|eur|francos suizos|dolares|euros/;

const FINANCIAL_NEGATIVE_SIGNALS =
  /no existe|no hay|no contempla|no genera|no crea|no implica|no conlleva|sin compromiso|sin costo|sin erogacion|sin financiamiento|monto referencial es cero|monto referencial de .0./;

function hasPaymentSignals(text: string): boolean {
  return FINANCIAL_POSITIVE_SIGNALS.test(text);
}

function hasNegativeFinancialLanguage(text: string): boolean {
  return FINANCIAL_NEGATIVE_SIGNALS.test(text);
}

function buildPositiveFinancialSummary(montoReferencial: string, evidence: string): string {
  if (evidence && evidence.length > 30) {
    const cleaned = evidence
      .replace(/\s+/g, " ")
      .trim();
    const prefix = "El instrumento sí contempla responsabilidad financiera.";
    if (montoReferencial) {
      return `${prefix} Monto de referencia: ${montoReferencial}. Según el documento: ${cleaned}`;
    }
    return `${prefix} Según el documento: ${cleaned}`;
  }

  return montoReferencial
    ? `El instrumento sí contempla responsabilidad financiera. El documento establece obligaciones de pago por parte de INDOTEL, con un monto de referencia de ${montoReferencial}.`
    : "El instrumento sí contempla responsabilidad financiera. El documento establece obligaciones explícitas de pago, costos o asunción de gastos a cargo de una de las partes.";
}

export function choosePreferredFinancialResponsibilitySummary(
  modelSummary: string,
  conventionData: Record<string, unknown>,
  documentText?: string
): string {
  const montoReferencial = readFichaContextValue(conventionData, "montoReferencial");
  const financialEvidence = readFichaContextValue(conventionData, "responsabilidadFinancieraEvidencia");

  const normalizedModel = normFichaValue(modelSummary);
  const normalizedDocument = normFichaValue(documentText);
  const normalizedEvidence = normFichaValue(financialEvidence);
  const allText = `${normalizedDocument} ${normalizedEvidence}`;

  const documentHasPayment = hasPaymentSignals(allText);
  const modelSaysNo = hasNegativeFinancialLanguage(normalizedModel);
  const structuredTrue = conventionData.responsabilidadFinanciera === true;

  console.log(
    `[financial-check] documentHasPayment=${documentHasPayment}, modelSaysNo=${modelSaysNo}, structuredTrue=${structuredTrue}, monto="${montoReferencial}", evidence=${financialEvidence ? financialEvidence.length + " chars" : "none"}`
  );

  if (!modelSaysNo) {
    return modelSummary;
  }

  if (documentHasPayment || structuredTrue || (montoReferencial && montoReferencial !== "0")) {
    return buildPositiveFinancialSummary(montoReferencial, financialEvidence);
  }

  return modelSummary;
}

function institutionHints(value: string): string[] {
  const normalized = normFichaValue(value);
  if (!normalized) return [];

  const hints = new Set<string>([normalized]);
  const acronym = value.match(/\(([^)]+)\)/)?.[1];
  if (acronym) hints.add(normFichaValue(acronym));

  const uppercaseTokens = value.match(/\b[A-Z]{2,10}\b/g) || [];
  for (const token of uppercaseTokens) {
    hints.add(normFichaValue(token));
  }

  for (const piece of normalized.split(/[^a-z0-9]+/)) {
    if (piece.length >= 4) hints.add(piece);
  }

  return [...hints].filter(Boolean);
}

function primaryInstitutionHints(conventionData: Record<string, unknown>): string[] {
  return [
    ...new Set([
      "indotel",
      ...institutionHints(readFichaContextValue(conventionData, "institucionPropia")),
    ]),
  ];
}

function counterpartHints(conventionData: Record<string, unknown>): string[] {
  return institutionHints(readFichaContextValue(conventionData, "contraparte"));
}

function isUnavailableFichaValue(value: string): boolean {
  const normalized = normFichaValue(value);
  return (
    !normalized ||
    normalized === "—" ||
    normalized.includes("[dato no disponible") ||
    normalized.includes("dato no disponible en el documento") ||
    normalized.includes("por determinar")
  );
}

function textSuggestsIndefiniteDuration(text: string | undefined): boolean {
  if (!text) return false;
  return INDEFINITE_DURATION_PATTERNS.some((pattern) => pattern.test(text));
}

function looksLikeTerminationNoticeDuration(value: string): boolean {
  return NOTICE_DURATION_PATTERNS.some((pattern) => pattern.test(value));
}

function hasExplicitFixedDuration(value: string): boolean {
  const normalized = normFichaValue(value);
  if (!normalized || looksLikeTerminationNoticeDuration(value)) return false;

  return (
    /\b\d+\s*(ano|anos|mes|meses|dia|dias)\b/i.test(normalized) ||
    /\b(?:uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+(?:ano|anos|mes|meses|dia|dias)\b/i.test(normalized) ||
    /\bhasta\s+el\s+\d{1,2}\b/i.test(normalized)
  );
}

export function choosePreferredFichaDuration(
  modelDuration: string,
  conventionData: Record<string, unknown>,
  documentText?: string
): string {
  const vigenciaTipo = readFichaContextValue(conventionData, "vigenciaTipo");
  const condicionTerminacion = readFichaContextValue(conventionData, "condicionTerminacion");

  if (textSuggestsIndefiniteDuration(documentText)) {
    return "Indefinida";
  }

  if (
    textSuggestsIndefiniteDuration(vigenciaTipo) ||
    textSuggestsIndefiniteDuration(condicionTerminacion)
  ) {
    return "Indefinida";
  }

  const structuredText = readFichaContextValue(conventionData, "duracionTexto");
  if (textSuggestsIndefiniteDuration(structuredText)) {
    return "Indefinida";
  }

  if (hasExplicitFixedDuration(structuredText)) {
    return structuredText;
  }

  const structuredMonths = conventionData.duracionMeses;
  if (typeof structuredMonths === "number" && structuredMonths > 0) {
    return `${structuredMonths} meses`;
  }

  const cleanedModelDuration = (modelDuration || "").trim();
  if (textSuggestsIndefiniteDuration(cleanedModelDuration)) {
    return "Indefinida";
  }

  if (hasExplicitFixedDuration(cleanedModelDuration)) {
    return cleanedModelDuration;
  }

  return "Indefinida";
}

function cleanPointFocalLabel(value: string): string {
  return value
    .replace(
      /^(?:punto\s+focal|punto\s+de\s+contacto|contacto|enlace|representante)\s*(?:de|para)?\s*/i,
      ""
    )
    .replace(
      /^(?:para|por|de\s+parte\s+de)\s+(?:el\s+)?(?:instituto dominicano de las telecomunicaciones\s*\(indotel\)|instituto dominicano de las telecomunicaciones|indotel)\s*[:\-]\s*/i,
      ""
    )
    .replace(
      /^(?:instituto dominicano de las telecomunicaciones\s*\(indotel\)|instituto dominicano de las telecomunicaciones|indotel)\s*[:\-]\s*/i,
      ""
    )
    .replace(/\s+/g, " ")
    .replace(/\s+([,;:.])/g, "$1")
    .trim();
}

function referencesCounterpartOnly(
  value: string,
  conventionData: Record<string, unknown>
): boolean {
  const normalized = normFichaValue(value);
  if (!normalized) return false;

  const primaryHints = primaryInstitutionHints(conventionData);
  const counterHints = counterpartHints(conventionData);

  const mentionsPrimary = primaryHints.some((hint) => hint && normalized.includes(hint));
  const mentionsCounterpart = counterHints.some((hint) => hint && normalized.includes(hint));

  return mentionsCounterpart && !mentionsPrimary;
}

function buildStructuredIndotelPointFocal(
  conventionData: Record<string, unknown>
): string {
  let value = readFichaContextValue(conventionData, "puntoFocal");
  const cargo = readFichaContextValue(conventionData, "cargoPuntoFocal");
  const correo = readFichaContextValue(conventionData, "correoPuntoFocal");

  if (cargo && !normFichaValue(value).includes(normFichaValue(cargo))) {
    value = value ? `${value}, ${cargo}` : cargo;
  }

  if (correo && !normFichaValue(value).includes(normFichaValue(correo))) {
    value = value ? `${value} (${correo})` : correo;
  }

  return cleanPointFocalLabel(value);
}

export function choosePreferredPointFocal(
  modelPointFocal: string,
  conventionData: Record<string, unknown>,
  _documentText?: string
): string {
  const structuredPointFocal = buildStructuredIndotelPointFocal(conventionData);
  const cleanedModelPointFocal = cleanPointFocalLabel(modelPointFocal);

  const candidates = [structuredPointFocal, cleanedModelPointFocal];
  const preferred = candidates.find(
    (candidate) =>
      candidate &&
      !isUnavailableFichaValue(candidate) &&
      !referencesCounterpartOnly(candidate, conventionData)
  );

  return preferred || "[Dato no disponible en el documento]";
}

const FICHA_JSON_SCHEMA = {
  type: "object",
  properties: {
    nombreDocumento:           { type: "string" },
    tipoInstrumento:           { type: "string" },
    fechaFirma:                { type: "string" },
    duracion:                  { type: "string" },
    estatus:                   { type: "string" },
    condicionTerminacion:      { type: "string" },
    puntoFocal:                { type: "string" },
    direccionesInvolucradas:   { type: "string" },
    enlace:                    { type: "string" },
    objetivo:                  { type: "string" },
    modalidadesCooperacion:    { type: "string" },
    actividades:               { type: "string" },
    areasCooperacion:          { type: "string" },
    temasSugeridos:            { type: "string" },
    responsabilidadFinanciera: { type: "string" },
    impactoEsperado:           { type: "string" },
    conclusion:                { type: "string" },
  },
  required: [
    "nombreDocumento", "tipoInstrumento", "fechaFirma", "duracion", "estatus",
    "condicionTerminacion", "puntoFocal", "direccionesInvolucradas", "enlace",
    "objetivo", "modalidadesCooperacion", "actividades", "areasCooperacion",
    "temasSugeridos", "responsabilidadFinanciera", "impactoEsperado", "conclusion",
  ],
  additionalProperties: false,
};

const FICHA_SYSTEM_PROMPT = `Eres un analista documental e institucional senior de la Dirección de Relaciones Internacionales de una institución pública reguladora de telecomunicaciones (INDOTEL - República Dominicana).

Tu tarea es generar una ficha técnica ejecutiva completa y de alta calidad sobre un instrumento de cooperación internacional. Actúas igual que un analista experto que recibe el PDF completo del convenio y lo analiza en profundidad para preparar un informe ejecutivo institucional.

════════════════════════════════════════
PRESENTACIÓN DE LA FICHA
════════════════════════════════════════
- NO incluyas líneas de fuente, evidencia, páginas, notas al pie ni textos como "[Fuente: ...]".
- La ficha final debe quedar limpia, ejecutiva y lista para lectura institucional.
- Puedes usar el documento completo como base analítica, pero NO muestres referencias ni citas de ubicación.

════════════════════════════════════════
ESTÁNDARES DE CALIDAD OBLIGATORIOS
════════════════════════════════════════
- Cada sección narrativa debe ser SUSTANCIAL, EXTENSA y DETALLADA. Escribe como analista senior, no como extractor de datos.
- NO seas breve ni telegráfico. DESARROLLA cada punto con explicaciones completas, contexto y análisis.
- El objetivo debe ocupar MÍNIMO 4-6 oraciones bien construidas. Explica el propósito, alcance, partes involucradas y marco jurídico.
- Las modalidades de cooperación deben enumerar y DESARROLLAR con detalle TODAS las que aparezcan. Para cada modalidad explica en qué consiste y cómo se implementa. Mínimo un párrafo por modalidad.
- Las actividades deben ser una lista detallada de TODO lo que el documento describe como acciones concretas. Si hay anexos con actividades, inclúyelos.
- Las áreas de cooperación deben reflejar con DETALLE EXTENSO el alcance temático real. Describe cada área con contexto técnico e institucional.
- Temas sugeridos: si existen, desarróllalos con explicación de cada uno. Si no, indica que no se especifican.
- La responsabilidad financiera debe explicar con detalle los compromisos, montos, plazos de pago, cuentas bancarias y cualquier dato financiero del documento.
- El impacto esperado debe ser un análisis razonado de MÍNIMO 5-6 puntos, cada uno con título y 2-3 oraciones de análisis profundo.
- La conclusión debe aportar valoración estratégica completa: importancia del instrumento, oportunidades, riesgos, recomendaciones de seguimiento y consideraciones de implementación. Mínimo 5-6 oraciones.
- NO escribas textos genéricos que podrían aplicar a cualquier convenio. ANCLA TODO al contenido específico del documento.
- Si el documento tiene listas, anexos temáticos, definiciones o secciones específicas, inclúyelos y desarróllalos completamente.
- REGLA DE EXTENSIÓN: si una sección tiene menos de 3 oraciones, estás siendo demasiado breve. Desarrolla más.

════════════════════════════════════════
CAMPOS DE LA TABLA IDENTIFICATORIA
════════════════════════════════════════

- nombreDocumento: Título completo y formal tal como aparece en el instrumento. Incluye nombres completos de las partes.
  Si ya recibes un nombre estructurado confiable del instrumento en los datos de entrada, CONSÉRVALO y no lo reformules ni lo expandas.

- tipoInstrumento: Tipo de instrumento (ej: "Memorándum de Entendimiento", "Acuerdo de Cooperación Técnica", "Convenio Marco de Colaboración", etc.)

- fechaFirma: Fecha de firma en formato legible en español. Ej: "4 de marzo del 2026"

- duracion: REGLA OBLIGATORIA — Valor por defecto: escribe exactamente "Indefinida" cuando el instrumento no fije un plazo concreto (sin años/meses explícitos, sin fecha de término determinada como plazo fijo, o cuando solo se hable de vigencia hasta notificación / sin plazo). Solo si el documento establece de forma explícita una duración (p. ej. "tres (3) años", "24 meses", "hasta el 31 de diciembre de 2030", plazo renovable con duración inicial concreta), transcribe esa redacción de forma clara en una o dos líneas. No inventes plazos. No uses "[Dato no disponible en el documento]" en este campo: en su lugar usa "Indefinida".

- estatus: Estado documental descrito en el texto (p. ej. si el instrumento se presenta como vigente). El estatus operativo en el sistema lo define el usuario (Vigente o Cancelado).

- condicionTerminacion: Cómo y bajo qué condiciones puede terminarse el instrumento. Cita el texto relevante del documento.

- puntoFocal: ⚠️ CAMPO CRÍTICO — LEE ESTE CAMPO CON MUCHO CUIDADO.
  Debes reportar SOLAMENTE el punto focal de INDOTEL / institución propia / parte principal.
  Si el documento muestra un contacto de la contraparte, DESCÁRTALO aunque aparezca primero o esté mejor formateado.
  Busca en el documento las secciones que mencionen "punto focal", "punto de contacto", "referente", "focal point", "representative", "enlace" o similares.
  Formato OBLIGATORIO:
    "[Nombre completo], [Cargo si disponible]"
  Ejemplo:
    "Amparo Arango Echeverri, Directora de Relaciones Internacionales"
  Si el documento lista varios puntos focales, ignora los de la contraparte y conserva solo el de INDOTEL / parte principal. No dejes vacío este campo.
  Si no puedes identificar con seguridad el contacto de INDOTEL, escribe exactamente "[Dato no disponible en el documento]". Nunca devuelvas el nombre de la contraparte en este campo.

- direccionesInvolucradas: ⚠️ CAMPO CRÍTICO — LEE ESTE CAMPO CON MUCHO CUIDADO.
  Este campo se refiere EXCLUSIVAMENTE a las UNIDADES ORGANIZATIVAS INTERNAS (Direcciones, Departamentos, Divisiones) del organigrama institucional que participan en la implementación del convenio.
  ❌ NO es una dirección postal ni una dirección física de calle.
  ✅ SÍ son ejemplos correctos: "Dirección del Espectro Radioeléctrico", "Dirección de Ciberseguridad", "Dirección de Relaciones Internacionales", "Dirección de Regulación y Defensa a la Competencia"
  Analiza el documento completo y deduce cuáles direcciones de INDOTEL probablemente participan, a partir del objeto del convenio, áreas técnicas, actividades, obligaciones, coordinación internacional, regulación, espectro, ciberseguridad, defensa de la competencia, asuntos jurídicos u otras funciones institucionales relacionadas.
  Prioriza SIEMPRE áreas internas de INDOTEL, no unidades de la contraparte.
  Si el documento no las enumera explícitamente, infiérelas razonablemente desde el contenido integral del instrumento, pero sin inventar áreas absurdas o desconectadas del texto.
  Formato: una dirección por línea usando \\n, sin bullets, sin numeración y sin agregar fuentes.
  Si no hay base suficiente para inferir varias, incluye al menos la dirección de INDOTEL más claramente vinculada al objeto del convenio.

- enlace: Nombre del archivo del documento, nombre de un archivo PDF de referencia, o enlace/correo mencionado en el instrumento.

════════════════════════════════════════
SECCIONES NARRATIVAS DETALLADAS
════════════════════════════════════════
Recuerda: NO agregues líneas [Fuente: ...] en ninguna sección.

- objetivo: MÍNIMO 3-4 oraciones. Explica: (1) finalidad central del instrumento, (2) tipo de cooperación y entre qué entidades, (3) si es vinculante o no vinculante según el documento, (4) resultado institucional esperado. Lenguaje formal ejecutivo.

- modalidadesCooperacion: Desarrolla TODAS las modalidades identificadas. Para cada una da una explicación operativa de su significado. Usa formato:\\n\\nLas modalidades de cooperación establecidas incluyen:\\n• [Modalidad]: [Explicación]\\n...\\n\\nIncluye cómo se formalizan si el documento lo indica.

- actividades: Lista las actividades concretas del instrumento con bullets •. Si el documento las enumera como lista específica, transcríbelas y desarrollalas.

- areasCooperacion: Desarrolla todas las áreas temáticas con contexto relevante. Usa bullets •.

- temasSugeridos: Si el documento tiene sección de "Temas Sugeridos" o lista adicional de temas, transcríbelos y desarrollalos con bullets •. Si no existe, escribe "El instrumento no especifica temas sugeridos adicionales más allá de las áreas de cooperación técnica descritas."

- responsabilidadFinanciera: ⚠️ CAMPO CRÍTICO — LEE CON MUCHO CUIDADO.
  Este campo debe contener un RESUMEN DETALLADO Y COMPLETO de las obligaciones financieras del instrumento.
  
  REGLA ABSOLUTA #1: si los datos de entrada indican responsabilidadFinanciera=true, DEBES escribir un párrafo POSITIVO detallado. NUNCA escribas "no hay", "no existe", "no contempla" compromisos financieros en este caso.
  
  REGLA ABSOLUTA #2: si hay un campo responsabilidadFinancieraEvidencia en los datos de entrada, úsalo como base para tu narrativa.
  
  Cuando responsabilidadFinanciera=true, tu narrativa DEBE incluir TODOS estos detalles que encuentres en el documento o datos:
  • Quién paga a quién (ej: "INDOTEL abonará a la UIT")
  • Monto exacto (ej: "7 000 CHF — siete mil francos suizos")
  • Plazo de pago (ej: "dentro de los 30 días siguientes a la firma")
  • Forma de pago y cuenta bancaria si aparece
  • Límite máximo si se menciona
  • Moneda y tipo de cambio si aplica
  • Cualquier otra obligación financiera o presupuestaria
  
  Escribe MÍNIMO 4-5 oraciones detalladas. Ejemplo de tono:
  "El instrumento sí contempla responsabilidad financiera. INDOTEL deberá abonar a la UIT un monto de 7 000 CHF por concepto de costos de la Actividad descrita en el Anexo 1. El pago se realizará en francos suizos dentro de los treinta (30) días posteriores a la firma. El importe total no excederá de 7 000 CHF. Los fondos se depositarán en la cuenta de UBS Switzerland AG, Ginebra (IBAN: CH58 0024...)."
  
  Si responsabilidadFinanciera=false, escribe que el instrumento no contempla obligaciones financieras.

- impactoEsperado: MÍNIMO 4-5 puntos, cada uno con título descriptivo y 2-3 oraciones de análisis. Ancla al documento específico. Incluye capacidades regulatorias, capital humano, objetivos estratégicos, tecnologías relevantes.

- conclusion: Valoración estratégica: importancia, oportunidades, acciones de seguimiento, consideraciones de implementación.

════════════════════════════════════════
REGLAS ABSOLUTAS
════════════════════════════════════════
- NO inventes nombres, fechas, cargos, instituciones ni datos que no estén en el documento.
- Si un dato no está disponible, escribe "[Dato no disponible en el documento]", salvo el campo "duracion": ahí aplica la regla de "Indefinida" por defecto (ver arriba), nunca uses el texto genérico de dato no disponible en duracion.
- USA \\n para saltos de línea dentro de los strings JSON.
- USA bullet • para listas (no guión, no asterisco).
- TONO: formal, ejecutivo, institucional, analítico.
- Devuelve SOLO el JSON válido, sin texto adicional.`;

export async function generateConventionFicha(
  conventionData: Record<string, unknown>,
  documentText?: string,
  documentBuffer?: { buffer: Buffer; filename: string; mimeType: string }
): Promise<FichaConvenio> {
  const client = getOpenAIClient();
  const model = models().summary;

  const docContext = documentText ? documentText.slice(0, 30_000) : null;

  console.log(
    `[openai] generateConventionFicha — model: ${model}, ` +
    `docText: ${docContext ? `${docContext.length} chars` : "none"}, ` +
    `hasBuffer: ${!!documentBuffer}`
  );

  const duracionReminder =
    "\n\n[Recordatorio campo JSON duracion]: Por defecto \"Indefinida\". Solo sustituye por texto del plazo si el documento o los campos duracionTexto/duracionMeses indican una duración explícita.";

  const structuredBlock = `CAMPOS ESTRUCTURADOS EXTRAÍDOS PREVIAMENTE:\n${JSON.stringify(conventionData, null, 2)}`;

  const hasBuffer = documentBuffer && documentBuffer.buffer.length > 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputMessages: any[] = [
    { role: "system", content: FICHA_SYSTEM_PROMPT },
  ];

  if (hasBuffer && !docContext) {
    const dataUrl = `data:${documentBuffer.mimeType};base64,${documentBuffer.buffer.toString("base64")}`;
    inputMessages.push({
      role: "user",
      content: [
        {
          type: "input_file" as const,
          filename: documentBuffer.filename,
          file_data: dataUrl,
        },
        {
          type: "input_text" as const,
          text: `A continuación tienes dos fuentes de información. Usa AMBAS para generar la ficha.

FUENTE 1 — ${structuredBlock}

FUENTE 2 — DOCUMENTO PDF COMPLETO (adjunto arriba).

Genera la ficha técnica basándote en el contenido completo del documento. Los campos estructurados son una guía; el texto del documento es la fuente primaria de verdad para los apartados narrativos. Escribe narrativas ricas y detalladas basadas en todo lo que leas en el PDF.${duracionReminder}`,
        },
      ],
    });
  } else if (docContext) {
    inputMessages.push({
      role: "user",
      content: `A continuación tienes dos fuentes de información. Usa AMBAS para generar la ficha.

FUENTE 1 — ${structuredBlock}

FUENTE 2 — TEXTO COMPLETO DEL DOCUMENTO ORIGINAL:
${docContext}

Genera la ficha técnica basándote en el contenido completo del documento. Los campos estructurados son una guía; el texto del documento es la fuente primaria de verdad para los apartados narrativos.${duracionReminder}`,
    });
  } else {
    inputMessages.push({
      role: "user",
      content: `Genera la ficha técnica del siguiente convenio a partir de los campos estructurados disponibles:\n\n${JSON.stringify(conventionData, null, 2)}${duracionReminder}`,
    });
  }

  try {
    const response = await client.responses.create({
      model,
      input: inputMessages,
      text: {
        format: {
          type: "json_schema",
          name: "FichaConvenio",
          schema: FICHA_JSON_SCHEMA,
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as FichaConvenio;
    return sanitizeFichaConvenio({
      ...parsed,
      nombreDocumento: choosePreferredDocumentName(parsed.nombreDocumento, conventionData),
      duracion: normalizeFichaDuracionCell(
        choosePreferredFichaDuration(parsed.duracion, conventionData, documentText)
      ),
      puntoFocal: choosePreferredPointFocal(parsed.puntoFocal, conventionData, documentText),
      responsabilidadFinanciera: choosePreferredFinancialResponsibilitySummary(
        parsed.responsabilidadFinanciera,
        conventionData,
        documentText
      ),
    });
  } catch (err) {
    const msg = toUserMessage(err);
    console.error(`[openai] ficha error: ${msg}`, err);
    throw new OpenAIExtractionError(`Error al generar la ficha: ${msg}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// healthCheckOpenAI
// ─────────────────────────────────────────────────────────────────────────────

export async function healthCheckOpenAI(): Promise<{
  ok: boolean;
  model: string;
  latencyMs: number;
  message: string;
}> {
  const start = Date.now();
  const model = models().extract;

  try {
    const client = getOpenAIClient();
    const response = await client.responses.create({
      model,
      input: 'Responde únicamente con la palabra: OPERATIVO',
    });

    const text = response.output_text?.trim();
    const latencyMs = Date.now() - start;

    console.log(`[openai] health check OK — model: ${model}, latency: ${latencyMs}ms, response: "${text}"`);

    return {
      ok: true,
      model,
      latencyMs,
      message: `Conexión exitosa. Modelo ${model} responde en ${latencyMs}ms.`,
    };
  } catch (err) {
    const msg = toUserMessage(err);
    const latencyMs = Date.now() - start;
    console.error(`[openai] health check FAILED — ${msg}`, err);
    return {
      ok: false,
      model,
      latencyMs,
      message: msg,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper — convert API errors to user-friendly messages
// ─────────────────────────────────────────────────────────────────────────────

function toUserMessage(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 401) return "API key inválida o no autorizada. Verifica OPENAI_API_KEY.";
    if (err.status === 429) {
      if (err.message.includes("quota") || err.message.includes("exceeded"))
        return "Cuota de OpenAI agotada. Añade créditos en https://platform.openai.com/settings/billing";
      return "Límite de solicitudes alcanzado. Espera unos segundos e intenta nuevamente.";
    }
    if (err.status === 503 || err.status === 529)
      return "Servicio de OpenAI temporalmente no disponible. Intenta más tarde.";
    if (err.message.includes("model") || err.status === 404)
      return `Modelo '${models().extract}' no encontrado. Verifica OPENAI_MODEL_EXTRACT en las variables de entorno.`;
    return `Error de OpenAI (${err.status}): ${err.message}`;
  }
  if (err instanceof OpenAIConfigError) return err.message;
  if (err instanceof Error) {
    if (err.message.includes("timeout") || err.message.includes("ETIMEDOUT"))
      return "La solicitud a OpenAI tardó demasiado. Intenta con un documento más corto.";
    return err.message;
  }
  return "Error desconocido al contactar OpenAI.";
}
