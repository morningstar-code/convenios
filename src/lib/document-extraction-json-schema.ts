/**
 * JSON Schema for OpenAI Responses API — evidence-based extraction.
 * Not using strict:true (nullable + nested enums are fragile in strict mode).
 */

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

function fieldNumber(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      value: { type: ["number", "null"] },
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

const listItem = fieldString();

export const DOCUMENT_EXTRACTION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    document_type: { type: ["string", "null"] },
    nombre_convenio: fieldString(),
    tipo_instrumento: fieldString(),
    parte_principal: fieldString(),
    contrapartes: { type: "array", items: listItem },
    paises_relacionados: { type: "array", items: listItem },
    fecha_firma: fieldString(),
    estatus_documental_estimado: fieldString(),
    vigencia_tipo: fieldString(),
    duracion_texto: fieldString(),
    duracion_meses: fieldNumber(),
    fecha_vencimiento_calculada: fieldString(),
    condicion_terminacion: fieldString(),
    dias_preaviso: fieldNumber(),
    responsabilidad_financiera: fieldBoolean(),
    renovacion_automatica: fieldBoolean(),
    objetivo: fieldString(),
    modalidades_cooperacion: { type: "array", items: listItem },
    areas_cooperacion: { type: "array", items: listItem },
    actividades: { type: "array", items: listItem },
    firmantes: { type: "array", items: listItem },
    puntos_focales: { type: "array", items: listItem },
    direcciones_involucradas: { type: "array", items: listItem },
    observaciones: fieldString(),
    monto_referencial: fieldNumber(),
    impacto_esperado: fieldString(),
    confianza_extraccion_global: { type: "number" },
    campos_dudosos: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "document_type",
    "nombre_convenio",
    "tipo_instrumento",
    "parte_principal",
    "contrapartes",
    "paises_relacionados",
    "fecha_firma",
    "estatus_documental_estimado",
    "vigencia_tipo",
    "duracion_texto",
    "duracion_meses",
    "fecha_vencimiento_calculada",
    "condicion_terminacion",
    "dias_preaviso",
    "responsabilidad_financiera",
    "renovacion_automatica",
    "objetivo",
    "modalidades_cooperacion",
    "areas_cooperacion",
    "actividades",
    "firmantes",
    "puntos_focales",
    "direcciones_involucradas",
    "observaciones",
    "monto_referencial",
    "impacto_esperado",
    "confianza_extraccion_global",
    "campos_dudosos",
    "warnings",
  ],
  additionalProperties: false,
};
