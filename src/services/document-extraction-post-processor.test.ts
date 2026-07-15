import { describe, it, expect } from "vitest";
import { coerceDocumentExtractionRaw } from "@/validators/document-extraction.schema";
import {
  postProcessDocumentExtraction,
  parseFlexibleDate,
  mapTipoInstrumento,
} from "@/services/document-extraction-post-processor";

describe("direcciones involucradas — solo las del organigrama", () => {
  it("descarta las que la IA se inventa y avisa de ello", () => {
    const raw = minimalRaw({
      direcciones_involucradas: [
        { value: "Dirección de Relaciones Internacionales", confidence: 0.9, evidence: null },
        { value: "Dirección de Innovación Disruptiva", confidence: 0.8, evidence: null },
      ],
    });

    const { normalized, warningsAdded, rulesApplied } = postProcessDocumentExtraction(raw);

    expect(normalized.direccionesInvolucradas).toEqual([
      "Dirección de Relaciones Internacionales",
    ]);
    expect(rulesApplied.some((r) => r.startsWith("direcciones_involucradas"))).toBe(true);
    expect(warningsAdded.some((w) => w.includes("Innovación Disruptiva"))).toBe(true);
  });

  it("completa el nombre oficial cuando la IA lo acorta", () => {
    const raw = minimalRaw({
      direcciones_involucradas: [
        { value: "Dirección de Ciberseguridad", confidence: 0.9, evidence: null },
      ],
    });

    expect(postProcessDocumentExtraction(raw).normalized.direccionesInvolucradas).toEqual([
      "Dirección de Ciberseguridad, Comercio Electrónico y Firma Digital",
    ]);
  });

  it("no avisa cuando todas son oficiales", () => {
    const raw = minimalRaw({
      direcciones_involucradas: [
        { value: "Dirección Jurídica", confidence: 0.9, evidence: null },
      ],
    });

    const { normalized, rulesApplied } = postProcessDocumentExtraction(raw);
    expect(normalized.direccionesInvolucradas).toEqual(["Dirección Jurídica"]);
    expect(rulesApplied.some((r) => r.startsWith("direcciones_involucradas"))).toBe(false);
  });
});

describe("parseFlexibleDate", () => {
  it("parses ISO", () => {
    const d = parseFlexibleDate("2023-03-15");
    expect(d?.getFullYear()).toBe(2023);
    expect(d?.getMonth()).toBe(2);
  });
  it("parses Spanish long form", () => {
    const d = parseFlexibleDate("15 de marzo de 2023");
    expect(d?.getFullYear()).toBe(2023);
  });
});

describe("mapTipoInstrumento", () => {
  it("maps memorandum keywords", () => {
    expect(mapTipoInstrumento("Memorándum de Entendimiento")).toBe(
      "memorando_entendimiento"
    );
  });
  it("returns otro for empty", () => {
    expect(mapTipoInstrumento(null)).toBe("otro");
  });
});

function minimalRaw(over: Record<string, unknown>) {
  return coerceDocumentExtractionRaw({
    document_type: "convenio_internacional",
    nombre_convenio: { value: "Acuerdo A–B", confidence: 0.9, evidence: null },
    tipo_instrumento: { value: "memorando", confidence: 0.8, evidence: null },
    parte_principal: { value: "Institución Alfa", confidence: 0.85, evidence: null },
    contrapartes: [{ value: "Institución Beta", confidence: 0.85, evidence: null }],
    paises_relacionados: [{ value: "País X", confidence: 0.7, evidence: null }],
    fecha_firma: { value: "2024-01-10", confidence: 0.9, evidence: null },
    estatus_documental_estimado: { value: "vigente", confidence: 0.5, evidence: null },
    vigencia_tipo: { value: "plazo fijo", confidence: 0.8, evidence: null },
    duracion_texto: { value: "24 meses", confidence: 0.8, evidence: null },
    duracion_meses: { value: 24, confidence: 0.85, evidence: null },
    fecha_vencimiento_calculada: { value: null, confidence: 0, evidence: null },
    condicion_terminacion: { value: null, confidence: 0, evidence: null },
    dias_preaviso: { value: null, confidence: 0, evidence: null },
    responsabilidad_financiera: { value: null, confidence: 0, evidence: null },
    renovacion_automatica: { value: false, confidence: 0.5, evidence: null },
    objetivo: { value: "Cooperar en materia Z", confidence: 0.9, evidence: null },
    modalidades_cooperacion: [],
    areas_cooperacion: [{ value: "Tema uno", confidence: 0.8, evidence: null }],
    actividades: [],
    firmantes: [{ value: "Director General", confidence: 0.6, evidence: null }],
    puntos_focales: [
      {
        value: "Unidad de cooperación — contacto@institución.gob",
        confidence: 0.9,
        evidence: { page: 2, text: "Punto focal: Unidad de cooperación" },
      },
    ],
    direcciones_involucradas: [],
    observaciones: { value: null, confidence: 0, evidence: null },
    monto_referencial: { value: null, confidence: 0, evidence: null },
    impacto_esperado: { value: null, confidence: 0, evidence: null },
    confianza_extraccion_global: 0.85,
    campos_dudosos: [],
    warnings: [],
    ...over,
  });
}

describe("postProcessDocumentExtraction", () => {
  it("computes expiration for fixed term", () => {
    const raw = minimalRaw({});
    const { normalized, rulesApplied } = postProcessDocumentExtraction(raw);
    expect(normalized.duracionMeses).toBe(24);
    expect(normalized.fechaVencimientoCalculada).not.toBeNull();
    expect(rulesApplied.some((r) => r.includes("fecha_vencimiento"))).toBe(true);
    expect(normalized.puntoFocal).toContain("Unidad de cooperación");
  });

  it("marks signature-line dates for human review without dropping the parsed date", () => {
    const raw = minimalRaw({
      fecha_firma: {
        value: "16/12/2025",
        confidence: 0.95,
        evidence: { page: 10, text: "Fecha: 16/12/2025" },
      },
    });
    const { normalized } = postProcessDocumentExtraction(raw);
    expect(normalized.fechaFirma).not.toBeNull();
    expect(normalized.campos_dudosos).toContain("fecha_firma");
    expect(normalized.warnings.some((w) => w.includes("fecha_firma"))).toBe(true);
  });

  it("does not mark a clear contextual typed date as dubious", () => {
    const raw = minimalRaw({
      fecha_firma: {
        value: "16 de diciembre de 2025",
        confidence: 0.95,
        evidence: {
          page: 1,
          text: "El presente Acuerdo de Cooperación Técnica fue suscrito el 16 de diciembre de 2025 entre las partes.",
        },
      },
    });
    const { normalized } = postProcessDocumentExtraction(raw);
    expect(normalized.fechaFirma).not.toBeNull();
    expect(normalized.campos_dudosos).not.toContain("fecha_firma");
  });

  it("prefers a clear evidence date over a misread extracted date", () => {
    const raw = minimalRaw({
      fecha_firma: {
        value: "28 de mayo de 2023",
        confidence: 0.95,
        evidence: {
          page: 9,
          text: "firman este Memorándum de Entendimiento por duplicado, en Ciudad de México, el 28 de mayo de 2025.",
        },
      },
    });
    const { normalized, rulesApplied } = postProcessDocumentExtraction(raw);
    expect(normalized.fechaFirma?.getFullYear()).toBe(2025);
    expect(rulesApplied.some((r) => r.includes("fecha_firma: corregida"))).toBe(true);
  });

  it("clears duration and end date for indefinite vigencia", () => {
    const raw = minimalRaw({
      vigencia_tipo: {
        value: "indefinida",
        confidence: 0.9,
        evidence: {
          page: 1,
          text: "permanecerá vigente hasta que una parte notifique su intención de darlo por terminado",
        },
      },
      duracion_meses: { value: 60, confidence: 0.3, evidence: null },
      condicion_terminacion: {
        value: "terminación por notificación",
        confidence: 0.85,
        evidence: null,
      },
    });
    const { normalized, rulesApplied } = postProcessDocumentExtraction(raw);
    expect(normalized.duracionMeses).toBeNull();
    expect(normalized.fechaVencimientoCalculada).toBeNull();
    expect(rulesApplied.some((r) => r.includes("vigencia_indefinida"))).toBe(true);
  });

  it("builds termination description with notice for indefinite instruments", () => {
    const raw = minimalRaw({
      vigencia_tipo: {
        value: "indefinida",
        confidence: 0.9,
        evidence: {
          page: 1,
          text: "permanecerán dichos efectos hasta que uno de ellos notifique al otro su intención de hacer cesar sus efectos",
        },
      },
      condicion_terminacion: {
        value: "Sin vencimiento fijo",
        confidence: 0.9,
        evidence: {
          page: 1,
          text: "hasta que uno de ellos notifique al otro su intención de hacer cesar sus efectos, con una antelación mínima de sesenta (60) días",
        },
      },
      dias_preaviso: { value: 60, confidence: 0.9, evidence: null },
    });
    const { normalized, rulesApplied } = postProcessDocumentExtraction(raw);
    expect(normalized.condicionTerminacion).toContain("Sin vencimiento fijo");
    expect(normalized.condicionTerminacion).toContain("60 días");
    expect(rulesApplied.some((r) => r.includes("condicion_terminacion"))).toBe(true);
  });

  it("sets financial responsibility false from generic no-cost clause", () => {
    const raw = minimalRaw({
      observaciones: {
        value: "El instrumento no genera obligaciones financieras para las partes",
        confidence: 0.9,
        evidence: { page: 3, text: "no genera obligaciones financieras" },
      },
    });
    const { normalized, rulesApplied } = postProcessDocumentExtraction(raw);
    expect(normalized.responsabilidadFinanciera).toBe(false);
    expect(rulesApplied.some((r) => r.includes("responsabilidad_financiera"))).toBe(true);
  });

  it("sets financial responsibility true from explicit payment clause", () => {
    const raw = minimalRaw({
      monto_referencial: {
        value: 7000,
        confidence: 0.95,
        evidence: { page: 2, text: "el INDOTEL abonará a la UIT los costos de la Actividad por un importe igual a 7 000 CHF" },
      },
      responsabilidad_financiera: {
        value: null,
        confidence: 0.2,
        evidence: null,
      },
      observaciones: {
        value: "INDOTEL abonará a la UIT los costos de la Actividad por un importe igual a 7 000 CHF.",
        confidence: 0.95,
        evidence: { page: 2, text: "abonará a la UIT los costos de la Actividad por un importe igual a 7 000 CHF" },
      },
    });
    const { normalized, rulesApplied } = postProcessDocumentExtraction(raw);
    expect(normalized.responsabilidadFinanciera).toBe(true);
    expect(rulesApplied.some((r) => r.includes("responsabilidad_financiera"))).toBe(true);
  });

  it("warns when only signatories and no focal points", () => {
    const raw = minimalRaw({
      puntos_focales: [],
      firmantes: [{ value: "Alto funcionario", confidence: 0.7, evidence: null }],
    });
    const { normalized } = postProcessDocumentExtraction(raw);
    expect(normalized.warnings.some((w) => w.includes("firmantes"))).toBe(true);
    expect(normalized.campos_dudosos).toContain("punto_focal");
  });

  it("prefers INDOTEL focal point over counterpart focal point", () => {
    const raw = minimalRaw({
      parte_principal: {
        value: "Instituto Dominicano de las Telecomunicaciones (INDOTEL)",
        confidence: 0.95,
        evidence: null,
      },
      puntos_focales: [
        {
          value: "Para INDOTEL: Amparo Arango Echeverri, Directora de Relaciones Internacionales",
          confidence: 0.9,
          evidence: null,
        },
        {
          value: "Para CRC: Mariana Sarmiento Arguello, cargo no especificado",
          confidence: 0.95,
          evidence: null,
        },
      ],
    });
    const { normalized } = postProcessDocumentExtraction(raw);
    expect(normalized.puntoFocal).toContain("Amparo Arango Echeverri");
    expect(normalized.puntoFocal).not.toContain("CRC");
  });

  it("prefers non-INDOTEL counterpart when contrapartes includes both parties", () => {
    const raw = minimalRaw({
      parte_principal: {
        value: "Instituto Dominicano de las Telecomunicaciones (INDOTEL)",
        confidence: 0.95,
        evidence: null,
      },
      nombre_convenio: {
        value: "Memorándum de Entendimiento entre INDOTEL y CRC",
        confidence: 0.95,
        evidence: null,
      },
      contrapartes: [
        { value: "Instituto Dominicano de las Telecomunicaciones (INDOTEL)", confidence: 0.9, evidence: null },
        { value: "CRC", confidence: 0.9, evidence: null },
      ],
    });
    const { normalized } = postProcessDocumentExtraction(raw);
    expect(normalized.contraparte).toBe("CRC");
  });

  it("falls back to title acronym when counterpart list is wrong", () => {
    const raw = minimalRaw({
      parte_principal: {
        value: "Instituto Dominicano de las Telecomunicaciones (INDOTEL)",
        confidence: 0.95,
        evidence: null,
      },
      nombre_convenio: {
        value: "Memorándum de Entendimiento entre INDOTEL-ASIET",
        confidence: 0.95,
        evidence: null,
      },
      contrapartes: [
        { value: "Instituto Dominicano de las Telecomunicaciones (INDOTEL)", confidence: 0.9, evidence: null },
      ],
    });
    const { normalized } = postProcessDocumentExtraction(raw);
    expect(normalized.contraparte).toBe("ASIET");
  });
});
