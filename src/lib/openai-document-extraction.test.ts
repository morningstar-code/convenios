import { describe, expect, it } from "vitest";
import {
  mergeCriticalFieldRefinement,
  type CriticalFieldRefinement,
} from "@/lib/openai-document-extraction";
import { coerceDocumentExtractionRaw } from "@/validators/document-extraction.schema";

describe("mergeCriticalFieldRefinement", () => {
  it("overrides focal points and financial responsibility when critical review finds better values", () => {
    const raw = coerceDocumentExtractionRaw({
      document_type: "convenio_internacional",
      nombre_convenio: { value: "Convenio A", confidence: 0.9, evidence: null },
      tipo_instrumento: { value: "memorando", confidence: 0.8, evidence: null },
      parte_principal: {
        value: "Instituto Dominicano de las Telecomunicaciones (INDOTEL)",
        confidence: 0.95,
        evidence: null,
      },
      contrapartes: [{ value: "UNFPA", confidence: 0.9, evidence: null }],
      paises_relacionados: [],
      fecha_firma: { value: "2024-01-10", confidence: 0.9, evidence: null },
      estatus_documental_estimado: { value: "vigente", confidence: 0.5, evidence: null },
      vigencia_tipo: { value: "indefinida", confidence: 0.9, evidence: null },
      duracion_texto: { value: null, confidence: 0, evidence: null },
      duracion_meses: { value: null, confidence: 0, evidence: null },
      fecha_vencimiento_calculada: { value: null, confidence: 0, evidence: null },
      condicion_terminacion: { value: null, confidence: 0, evidence: null },
      dias_preaviso: { value: null, confidence: 0, evidence: null },
      responsabilidad_financiera: { value: null, confidence: 0.2, evidence: null },
      renovacion_automatica: { value: false, confidence: 0.5, evidence: null },
      objetivo: { value: "Cooperacion", confidence: 0.9, evidence: null },
      modalidades_cooperacion: [],
      areas_cooperacion: [],
      actividades: [],
      firmantes: [],
      puntos_focales: [],
      direcciones_involucradas: [],
      observaciones: { value: null, confidence: 0, evidence: null },
      monto_referencial: { value: null, confidence: 0, evidence: null },
      impacto_esperado: { value: null, confidence: 0, evidence: null },
      confianza_extraccion_global: 0.8,
      campos_dudosos: ["punto_focal"],
      warnings: [],
    });

    const refined: CriticalFieldRefinement = {
      puntos_focales: [
        {
          value: "Ana Carolina Franco, Gerente",
          confidence: 0.94,
          evidence: {
            page: 4,
            text: "Por el INSTITUTO DOMINICANO DE LAS TELECOMUNICACIONES (INDOTEL): Contacto: Ana Carolina Franco, Gerente",
          },
        },
      ],
      responsabilidad_financiera: {
        value: false,
        confidence: 0.95,
        evidence: {
          page: 3,
          text: "El presente acuerdo no genera obligaciones financieras para las partes.",
        },
      },
      campos_dudosos: [],
      warnings: [],
      model: "gpt-4.1",
    };

    const merged = mergeCriticalFieldRefinement(raw, refined);

    expect(merged.puntos_focales[0]?.value).toContain("Ana Carolina Franco");
    expect(merged.responsabilidad_financiera.value).toBe(false);
  });
});
