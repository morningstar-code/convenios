/**
 * Zod schemas for evidence-based document extraction (v2).
 */

import { z } from "zod";

export const EvidenceSchema = z.object({
  page: z.number().int().nullable(),
  text: z.string().nullable(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const StringFieldSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  evidence: EvidenceSchema.nullable(),
});

export const NumberFieldSchema = z.object({
  value: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  evidence: EvidenceSchema.nullable(),
});

export const BooleanFieldSchema = z.object({
  value: z.boolean().nullable(),
  confidence: z.number().min(0).max(1),
  evidence: EvidenceSchema.nullable(),
});

export const StringListItemSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  evidence: EvidenceSchema.nullable(),
});

export type StringField = z.infer<typeof StringFieldSchema>;
export type NumberField = z.infer<typeof NumberFieldSchema>;
export type BooleanField = z.infer<typeof BooleanFieldSchema>;
export type StringListItem = z.infer<typeof StringListItemSchema>;

export const DocumentExtractionRawSchema = z.object({
  document_type: z.string().nullable(),
  nombre_convenio: StringFieldSchema,
  tipo_instrumento: StringFieldSchema,
  parte_principal: StringFieldSchema,
  contrapartes: z.array(StringListItemSchema),
  paises_relacionados: z.array(StringListItemSchema),
  fecha_firma: StringFieldSchema,
  estatus_documental_estimado: StringFieldSchema,
  vigencia_tipo: StringFieldSchema,
  duracion_texto: StringFieldSchema,
  duracion_meses: NumberFieldSchema,
  fecha_vencimiento_calculada: StringFieldSchema,
  condicion_terminacion: StringFieldSchema,
  dias_preaviso: NumberFieldSchema,
  responsabilidad_financiera: BooleanFieldSchema,
  renovacion_automatica: BooleanFieldSchema,
  objetivo: StringFieldSchema,
  modalidades_cooperacion: z.array(StringListItemSchema),
  areas_cooperacion: z.array(StringListItemSchema),
  actividades: z.array(StringListItemSchema),
  firmantes: z.array(StringListItemSchema),
  puntos_focales: z.array(StringListItemSchema),
  direcciones_involucradas: z.array(StringListItemSchema),
  observaciones: StringFieldSchema,
  monto_referencial: NumberFieldSchema,
  impacto_esperado: StringFieldSchema,
  confianza_extraccion_global: z.number().min(0).max(1),
  campos_dudosos: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type DocumentExtractionRaw = z.infer<typeof DocumentExtractionRawSchema>;

export type NormalizedConventionPayload = {
  tipoInstrumento: string;
  contraparte: string;
  pais: string;
  nombreConvenio: string | null;
  partePrincipal: string | null;
  fechaFirma: Date | null;
  duracionTexto: string | null;
  duracionMeses: number | null;
  fechaVencimientoCalculada: Date | null;
  renovacionAutomatica: boolean;
  estatus: string;
  condicionTerminacion: string | null;
  diasPreaviso: number | null;
  puntoFocal: string;
  cargoPuntoFocal: string | null;
  correoPuntoFocal: string | null;
  direccionesInvolucradas: string[];
  objetivo: string;
  modalidadesCooperacion: string[];
  areasCooperacion: string[];
  actividades: string[];
  firmantes: string[];
  puntosFocales: string[];
  impactoEsperado: string | null;
  responsabilidadFinanciera: boolean;
  montoReferencial: string | null;
  observaciones: string | null;
  vigenciaTipo: string | null;
  confianza_extraccion: number;
  campos_dudosos: string[];
  warnings: string[];
};

export type ExtractionPipelineLog = {
  path: "text" | "file";
  model: string;
  openaiLatencyMs: number;
  postProcessorRulesApplied: string[];
  postProcessorWarningsAdded: string[];
};

export function emptyStringField(): StringField {
  return { value: null, confidence: 0, evidence: null };
}

export function emptyNumberField(): NumberField {
  return { value: null, confidence: 0, evidence: null };
}

export function emptyBooleanField(): BooleanField {
  return { value: null, confidence: 0, evidence: null };
}

function mergeStringField(raw: unknown, fallback: StringField): StringField {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const ev = o.evidence;
  let evidence: Evidence | null = null;
  if (ev && typeof ev === "object") {
    const e = ev as Record<string, unknown>;
    evidence = {
      page: typeof e.page === "number" && Number.isFinite(e.page) ? Math.trunc(e.page) : null,
      text: typeof e.text === "string" ? e.text : e.text === null ? null : null,
    };
  } else if (ev === null) evidence = null;
  return {
    value: typeof o.value === "string" ? o.value : o.value === null ? null : fallback.value,
    confidence:
      typeof o.confidence === "number" && o.confidence >= 0 && o.confidence <= 1
        ? o.confidence
        : fallback.confidence,
    evidence,
  };
}

function mergeNumberField(raw: unknown, fallback: NumberField): NumberField {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const ev = o.evidence;
  let evidence: Evidence | null = null;
  if (ev && typeof ev === "object") {
    const e = ev as Record<string, unknown>;
    evidence = {
      page: typeof e.page === "number" ? e.page : null,
      text: typeof e.text === "string" ? e.text : e.text === null ? null : null,
    };
  } else if (ev === null) evidence = null;
  return {
    value: typeof o.value === "number" ? o.value : o.value === null ? null : fallback.value,
    confidence:
      typeof o.confidence === "number" && o.confidence >= 0 && o.confidence <= 1
        ? o.confidence
        : fallback.confidence,
    evidence,
  };
}

function mergeBooleanField(raw: unknown, fallback: BooleanField): BooleanField {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const ev = o.evidence;
  let evidence: Evidence | null = null;
  if (ev && typeof ev === "object") {
    const e = ev as Record<string, unknown>;
    evidence = {
      page: typeof e.page === "number" ? e.page : null,
      text: typeof e.text === "string" ? e.text : e.text === null ? null : null,
    };
  } else if (ev === null) evidence = null;
  return {
    value: typeof o.value === "boolean" ? o.value : o.value === null ? null : fallback.value,
    confidence:
      typeof o.confidence === "number" && o.confidence >= 0 && o.confidence <= 1
        ? o.confidence
        : fallback.confidence,
    evidence,
  };
}

function mergeList(raw: unknown): StringListItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => mergeStringField(item, emptyStringField()));
}

/** Coerce partial / malformed model output before strict Zod parse */
export function coerceDocumentExtractionRaw(input: unknown): DocumentExtractionRaw {
  const o =
    typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const base = emptyStringField();
  return DocumentExtractionRawSchema.parse({
    document_type: typeof o.document_type === "string" ? o.document_type : null,
    nombre_convenio: mergeStringField(o.nombre_convenio, base),
    tipo_instrumento: mergeStringField(o.tipo_instrumento, base),
    parte_principal: mergeStringField(o.parte_principal, base),
    contrapartes: mergeList(o.contrapartes),
    paises_relacionados: mergeList(o.paises_relacionados),
    fecha_firma: mergeStringField(o.fecha_firma, base),
    estatus_documental_estimado: mergeStringField(o.estatus_documental_estimado, base),
    vigencia_tipo: mergeStringField(o.vigencia_tipo, base),
    duracion_texto: mergeStringField(o.duracion_texto, base),
    duracion_meses: mergeNumberField(o.duracion_meses, emptyNumberField()),
    fecha_vencimiento_calculada: mergeStringField(o.fecha_vencimiento_calculada, base),
    condicion_terminacion: mergeStringField(o.condicion_terminacion, base),
    dias_preaviso: mergeNumberField(o.dias_preaviso, emptyNumberField()),
    responsabilidad_financiera: mergeBooleanField(
      o.responsabilidad_financiera,
      emptyBooleanField()
    ),
    renovacion_automatica: mergeBooleanField(o.renovacion_automatica, emptyBooleanField()),
    objetivo: mergeStringField(o.objetivo, base),
    modalidades_cooperacion: mergeList(o.modalidades_cooperacion),
    areas_cooperacion: mergeList(o.areas_cooperacion),
    actividades: mergeList(o.actividades),
    firmantes: mergeList(o.firmantes),
    puntos_focales: mergeList(o.puntos_focales),
    direcciones_involucradas: mergeList(o.direcciones_involucradas),
    observaciones: mergeStringField(o.observaciones, base),
    monto_referencial: mergeNumberField(o.monto_referencial, emptyNumberField()),
    impacto_esperado: mergeStringField(o.impacto_esperado, base),
    confianza_extraccion_global:
      typeof o.confianza_extraccion_global === "number"
        ? o.confianza_extraccion_global
        : 0.5,
    campos_dudosos: Array.isArray(o.campos_dudosos)
      ? o.campos_dudosos.filter((x): x is string => typeof x === "string")
      : [],
    warnings: Array.isArray(o.warnings)
      ? o.warnings.filter((x): x is string => typeof x === "string")
      : [],
  });
}
