/**
 * Deterministic post-processing for evidence-based extraction.
 * No institution names, no document-specific branches — only patterns and field logic.
 */

import { addMonths } from "date-fns";
import { filterDirecciones, findUnknownDirecciones } from "@/lib/indotel-org";
import type { InstrumentType, ConventionStatus } from "@prisma/client";
import type {
  DocumentExtractionRaw,
  NormalizedConventionPayload,
} from "@/validators/document-extraction.schema";

const INDEFINITE_PATTERNS = [
  /hasta\s+que\s+(una\s+)?(de\s+)?las\s+partes/i,
  /notifique.*(termin|finaliz|denunci)/i,
  /permanecer[aá]\s+vigente\s+hasta/i,
  /sin\s+plazo\s+determinado/i,
  /duraci[oó]n\s+indefinida/i,
  /plazo\s+indefinido/i,
  /vigencia\s+indefinida/i,
];

const NO_FINANCIAL_PATTERNS = [
  /no\s+genera(n)?\s+(obligaciones\s+)?financieras/i,
  /sin\s+erogaciones/i,
  /no\s+implica\s+transferencias?\s+de\s+fondos/i,
  /no\s+crea\s+compromisos?\s+financieros/i,
  /sin\s+costo/i,
  /a\s+costo\s+cero/i,
  /no\s+conlleva\s+costos?/i,
];

const YES_FINANCIAL_PATTERNS = [
  /\bpag(ar|o|ara|ará|arse)\b/i,
  /\babonar[aá]?\b/i,
  /\bcostos?\b/i,
  /\bgastos?\b/i,
  /\bimporte\b/i,
  /\bfinanciamiento\b/i,
  /\bpresupuesto\b/i,
  /\bvi[aá]ticos?\b/i,
  /\breembolsos?\b/i,
  /\baport(es|es?)\b/i,
  /\btransferenc(?:ia|ias)\b/i,
  /\bchf\b/i,
  /\busd\b/i,
  /\beur\b/i,
];

function norm(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/** Map free-text instrument label to Prisma enum — generic keywords only */
export function mapTipoInstrumento(raw: string | null): InstrumentType {
  const x = norm(raw);
  if (!x) return "otro";
  if (x.includes("memorand") || x.includes("mou") || x.includes("entendimiento"))
    return "memorando_entendimiento";
  if (x.includes("convenio marco") || x.includes("acuerdo marco")) return "convenio_marco";
  if (x.includes("convenio especific") || x.includes("convenio particular"))
    return "convenio_especifico";
  if (x.includes("acuerdo de cooperacion") || x.includes("acuerdo cooperacion"))
    return "acuerdo_cooperacion";
  if (x.includes("protocolo")) return "protocolo";
  if (x.includes("declaracion conjunta") || x.includes("joint declaration"))
    return "declaracion_conjunta";
  if (x.includes("convenio")) return "convenio_especifico";
  return "otro";
}

/** El estatus operativo (vigente/cancelado) lo define el usuario; la extracción solo sugiere vigencia documental. */
export function mapConventionStatus(_raw: string | null): ConventionStatus {
  return "vigente";
}

/** Try ISO, then common Spanish / Latin date phrases */
export function parseFlexibleDate(s: string | null): Date | null {
  if (!s || !s.trim()) return null;
  const t = s.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(t);
  if (iso) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const dmy = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const months: Record<string, number> = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    setiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11,
  };
  const m = t.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i);
  if (m) {
    const mo = months[norm(m[2])];
    if (mo !== undefined) {
      const d = new Date(Number(m[3]), mo, Number(m[1]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const d2 = new Date(t);
  return Number.isNaN(d2.getTime()) ? null : d2;
}

function datesSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseDateFromEvidence(text: string | null | undefined): Date | null {
  if (!text) return null;

  const spanish = text.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i);
  if (spanish) {
    const parsed = parseFlexibleDate(spanish[0]);
    if (parsed) return parsed;
  }

  const dmy = text.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/);
  if (dmy) {
    const parsed = parseFlexibleDate(dmy[1]);
    if (parsed) return parsed;
  }

  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) {
    const parsed = parseFlexibleDate(iso[1]);
    if (parsed) return parsed;
  }

  return null;
}

function textLooksIndefinite(raw: DocumentExtractionRaw): boolean {
  const vt = norm(raw.vigencia_tipo.value);
  if (vt.includes("indefin") || vt.includes("abiert") || vt.includes("sin plazo"))
    return true;
  const cond = raw.condicion_terminacion.value || "";
  const ev = raw.condicion_terminacion.evidence?.text || "";
  const blob = `${cond} ${ev}`;
  return INDEFINITE_PATTERNS.some((re) => re.test(blob));
}

function listValues(items: { value: string | null }[]): string[] {
  return items.map((i) => (i.value || "").trim()).filter(Boolean);
}

function looksLikePrimaryInstitution(value: string, raw: DocumentExtractionRaw): boolean {
  const normalized = norm(value);
  return primaryInstitutionHints(raw).some((hint) => normalized.includes(hint));
}

function inferCounterpartFromTitle(raw: DocumentExtractionRaw): string {
  const title = (raw.nombre_convenio.value || "").trim();
  if (!title) return "";

  const acronymMatch = title.match(/indotel[\s\-/]+([A-Z]{2,10})\b/i);
  if (acronymMatch && !looksLikePrimaryInstitution(acronymMatch[1], raw)) {
    return acronymMatch[1].toUpperCase();
  }

  const candidates = title.match(/\b[A-Z]{2,10}\b/g) || [];
  const firstDistinct = candidates.find((candidate) => !looksLikePrimaryInstitution(candidate, raw));
  return firstDistinct || "";
}

function pickPrimaryContraparte(raw: DocumentExtractionRaw): string {
  const parts = listValues(raw.contrapartes);
  const distinctCounterpart = parts.find((part) => !looksLikePrimaryInstitution(part, raw));
  if (distinctCounterpart) return distinctCounterpart;

  const titleCounterpart = inferCounterpartFromTitle(raw);
  if (titleCounterpart) return titleCounterpart;

  if (parts.length > 0) return parts[0];
  const pp = (raw.parte_principal.value || "").trim();
  if (pp) return pp;
  return "";
}

function pickPais(raw: DocumentExtractionRaw): string {
  const ps = listValues(raw.paises_relacionados);
  if (ps.length > 0) return ps.join(", ");
  return "";
}

function primaryInstitutionHints(raw: DocumentExtractionRaw): string[] {
  const partePrincipal = norm(raw.parte_principal.value);
  const hints = new Set<string>(["indotel"]);

  if (partePrincipal) {
    hints.add(partePrincipal);
    const acronym = raw.parte_principal.value?.match(/\(([^)]+)\)/)?.[1];
    if (acronym) hints.add(norm(acronym));

    for (const piece of partePrincipal.split(/[^a-z0-9]+/)) {
      if (piece.length >= 4) hints.add(piece);
    }
  }

  return [...hints].filter(Boolean);
}

function focalLooksLikePrimaryInstitution(line: string, raw: DocumentExtractionRaw): boolean {
  return looksLikePrimaryInstitution(line, raw);
}

function pickPuntoFocal(raw: DocumentExtractionRaw): { nombre: string; cargo: string | null; correo: string | null } {
  const focos = raw.puntos_focales.filter((item) => (item.value || "").trim());
  if (focos.length > 0) {
    const primaryMatch = focos.find((item) => focalLooksLikePrimaryInstitution(item.value || "", raw));
    const selected = primaryMatch || focos[0];
    const line = selected.value || "";
    const emailMatch = line.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
    const correo = emailMatch ? emailMatch[0] : null;
    const sinCorreo = correo ? line.replace(correo, "").replace(/[;,]\s*$/, "").trim() : line;
    return { nombre: sinCorreo || line, cargo: null, correo };
  }
  const firmas = listValues(raw.firmantes);
  if (firmas.length > 0) {
    return {
      nombre: `[Revisar] Posible firmante (no focal explícito): ${firmas[0]}`,
      cargo: null,
      correo: null,
    };
  }
  return { nombre: "", cargo: null, correo: null };
}

function buildTerminationCondition(params: {
  rawValue: string | null;
  evidenceText: string | null | undefined;
  indefinite: boolean;
  diasPreaviso: number | null | undefined;
}): string | null {
  const rawValue = (params.rawValue || "").trim();
  const evidenceText = (params.evidenceText || "").trim();
  const source = `${rawValue} ${evidenceText}`.trim();
  const lower = norm(source);

  const mentionsNotification =
    /notific|preavis|antelaci|hacer cesar|darlo por terminado|cesaci|termin/.test(lower);

  if (params.indefinite && params.diasPreaviso && mentionsNotification) {
    return `Sin vencimiento fijo; puede darse por terminado mediante notificación con al menos ${params.diasPreaviso} días de antelación.`;
  }

  if (rawValue) {
    return rawValue;
  }

  if (params.indefinite) {
    return "Sin vencimiento fijo.";
  }

  return null;
}

function dateEvidenceNeedsReview(raw: DocumentExtractionRaw): string | null {
  if (!raw.fecha_firma.value) return null;

  const evidence = raw.fecha_firma.evidence?.text || "";
  const evidenceNorm = norm(evidence);
  const valueNorm = norm(raw.fecha_firma.value);
  const isSignatureDateLine =
    /\bfecha\b/.test(evidenceNorm) &&
    /\b(firma|firmante|suscrib|rubric|signat|signature)\b/.test(evidenceNorm);
  const looksLikeHandwrittenSignatureContext =
    /\b(manuscrit|a mano|handwrit|ilegible|firma|rubric)\b/.test(evidenceNorm);
  const dateLabelOnlyEvidence =
    /^\s*fecha\s*:?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s*$/.test(evidenceNorm);
  const weakDateOnlyEvidence =
    evidenceNorm.length > 0 &&
    evidenceNorm.length <= 30 &&
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/.test(evidenceNorm);

  if (raw.fecha_firma.confidence < 0.85) {
    return "fecha_firma: confianza baja; requiere revisión humana antes de validar.";
  }

  if (raw.fecha_firma.confidence < 0.93 && weakDateOnlyEvidence) {
    return "fecha_firma: evidencia muy breve o sin contexto documental; requiere revisión humana.";
  }

  if (isSignatureDateLine || looksLikeHandwrittenSignatureContext || dateLabelOnlyEvidence) {
    return "fecha_firma: parece provenir de una línea de firma o fecha manuscrita; requiere revisión humana.";
  }

  if (evidence && valueNorm && !evidenceNorm.includes(valueNorm) && raw.fecha_firma.confidence < 0.93) {
    return "fecha_firma: la fecha extraída no aparece claramente en la evidencia citada; requiere revisión humana.";
  }

  return null;
}

export type PostProcessResult = {
  normalized: NormalizedConventionPayload;
  rulesApplied: string[];
  warningsAdded: string[];
};

export function postProcessDocumentExtraction(raw: DocumentExtractionRaw): PostProcessResult {
  const rulesApplied: string[] = [];
  const warningsAdded: string[] = [...raw.warnings];
  const camposDudosos = [...raw.campos_dudosos];

  const indefinite = textLooksIndefinite(raw);
  if (indefinite) {
    rulesApplied.push("vigencia_indefinida: duracion_meses y fecha_vencimiento forzados a null");
    if (raw.duracion_texto.value)
      rulesApplied.push("duracion_texto: conservado solo como referencia narrativa");
  }

  let fechaFirma = parseFlexibleDate(raw.fecha_firma.value);
  const fechaFirmaEvidencia = parseDateFromEvidence(raw.fecha_firma.evidence?.text);
  if (fechaFirma && fechaFirmaEvidencia && !datesSameDay(fechaFirma, fechaFirmaEvidencia)) {
    fechaFirma = fechaFirmaEvidencia;
    rulesApplied.push("fecha_firma: corregida usando fecha clara en evidencia textual");
  }
  if (raw.fecha_firma.value && !fechaFirma) {
    warningsAdded.push(
      "fecha_firma: el valor no pudo normalizarse a fecha ISO; requiere revisión humana."
    );
    camposDudosos.push("fecha_firma");
  }
  const fechaFirmaReviewWarning = fechaFirma ? dateEvidenceNeedsReview(raw) : null;
  if (fechaFirmaReviewWarning) {
    warningsAdded.push(fechaFirmaReviewWarning);
    camposDudosos.push("fecha_firma");
  }

  const duracionMeses = indefinite ? null : raw.duracion_meses.value;
  if (!indefinite && duracionMeses !== null && duracionMeses !== undefined) {
    rulesApplied.push("duracion_meses: tomado del modelo");
  }
  if (!indefinite && fechaFirma && duracionMeses && duracionMeses > 0) {
    rulesApplied.push("fecha_vencimiento: calculada desde fecha_firma + duracion_meses");
  }

  let fechaVencimiento: Date | null = null;
  if (!indefinite && fechaFirma && duracionMeses && duracionMeses > 0) {
    try {
      fechaVencimiento = addMonths(fechaFirma, duracionMeses);
    } catch {
      fechaVencimiento = null;
    }
  }

  const parsedVencModel = indefinite
    ? null
    : parseFlexibleDate(raw.fecha_vencimiento_calculada.value);
  if (!indefinite && !fechaVencimiento && parsedVencModel) {
    fechaVencimiento = parsedVencModel;
    rulesApplied.push("fecha_vencimiento: used model-provided date when months missing");
  }

  const condText = `${raw.condicion_terminacion.value || ""} ${raw.condicion_terminacion.evidence?.text || ""}`;
  let diasPreaviso = raw.dias_preaviso.value;
  const preavisoMatch = condText.match(/(\d+)\s*d[ií]as?\s*(de\s+)?(antelaci|preaviso|notificaci)/i);
  if (preavisoMatch && (diasPreaviso === null || diasPreaviso === undefined)) {
    diasPreaviso = parseInt(preavisoMatch[1], 10);
    rulesApplied.push("dias_preaviso: inferred from termination clause pattern");
  }
  const condicionTerminacion = buildTerminationCondition({
    rawValue: raw.condicion_terminacion.value,
    evidenceText: raw.condicion_terminacion.evidence?.text,
    indefinite,
    diasPreaviso,
  });
  if (condicionTerminacion && condicionTerminacion !== raw.condicion_terminacion.value) {
    rulesApplied.push("condicion_terminacion: normalized with indefinite-term and notice details");
  }

  let responsabilidad = raw.responsabilidad_financiera.value;
  const finEvidence = [
    raw.observaciones.value || "",
    raw.objetivo.evidence?.text || "",
    raw.responsabilidad_financiera.evidence?.text || "",
    raw.monto_referencial.evidence?.text || "",
  ].join(" ");
  if (responsabilidad === null) {
    if (NO_FINANCIAL_PATTERNS.some((re) => re.test(finEvidence))) {
      responsabilidad = false;
      rulesApplied.push("responsabilidad_financiera: false from no-cost clause pattern");
    } else if (
      YES_FINANCIAL_PATTERNS.some((re) => re.test(finEvidence)) ||
      raw.monto_referencial.value !== null
    ) {
      responsabilidad = true;
      rulesApplied.push("responsabilidad_financiera: true from payment/cost clause pattern");
    }
  }

  const renovacion =
    raw.renovacion_automatica.value === true ||
    norm(raw.vigencia_tipo.value).includes("renov");

  const focal = pickPuntoFocal(raw);
  if (focal.nombre.startsWith("[Revisar]")) {
    warningsAdded.push(
      "punto_focal: no hay sección clara de contacto/focal; se sugiere revisar firmantes."
    );
    camposDudosos.push("punto_focal");
  }

  const firmantes = listValues(raw.firmantes);
  if (firmantes.length > 0 && listValues(raw.puntos_focales).length === 0) {
    warningsAdded.push(
      "firmantes detectados sin puntos_focales explícitos: no usar firmantes como contacto operativo sin verificar."
    );
  }

  const contraparte = pickPrimaryContraparte(raw);
  const pais = pickPais(raw);
  const partePrincipal = (raw.parte_principal.value || "").trim() || null;
  const nombreConvenio = (raw.nombre_convenio.value || "").trim() || null;

  if (contrapartesAmbiguous(raw)) {
    warningsAdded.push(
      "contrapartes: múltiples partes detectadas; verificar cuál es contraparte principal para el registro."
    );
    camposDudosos.push("contraparte");
  }

  const tipoInstrumento = mapTipoInstrumento(raw.tipo_instrumento.value);
  const estatus = mapConventionStatus(raw.estatus_documental_estimado.value);

  // Las direcciones involucradas solo pueden salir del organigrama oficial:
  // lo que el modelo se invente se descarta y queda registrado como aviso.
  const direccionesPropuestas = listValues(raw.direcciones_involucradas);
  const direccionesOficiales = filterDirecciones(direccionesPropuestas);
  const direccionesInventadas = findUnknownDirecciones(direccionesPropuestas);

  if (direccionesInventadas.length > 0) {
    rulesApplied.push(
      `direcciones_involucradas: ${direccionesInventadas.length} fuera del organigrama descartada(s)`
    );
    warningsAdded.push(
      `direcciones_involucradas: la IA propuso unidades que no existen en el organigrama del INDOTEL y se descartaron (${direccionesInventadas.join("; ")}).`
    );
    camposDudosos.push("direcciones_involucradas");
  }

  const objetivo =
    (raw.objetivo.value || "").trim() ||
    "Objeto no extraído con claridad — pendiente de validación humana.";

  const confianza = Math.min(
    1,
    Math.max(0, raw.confianza_extraccion_global)
  );

  const normalized: NormalizedConventionPayload = {
    tipoInstrumento,
    contraparte: contraparte || "Por determinar",
    pais: pais || "Por determinar",
    nombreConvenio,
    partePrincipal,
    fechaFirma,
    duracionTexto: raw.duracion_texto.value,
    duracionMeses: indefinite ? null : duracionMeses,
    fechaVencimientoCalculada: indefinite ? null : fechaVencimiento,
    renovacionAutomatica: renovacion,
    estatus,
    condicionTerminacion,
    diasPreaviso,
    puntoFocal: focal.nombre || "Por determinar",
    cargoPuntoFocal: focal.cargo,
    correoPuntoFocal: focal.correo,
    direccionesInvolucradas: direccionesOficiales,
    objetivo,
    modalidadesCooperacion: listValues(raw.modalidades_cooperacion),
    areasCooperacion: listValues(raw.areas_cooperacion),
    actividades: listValues(raw.actividades),
    firmantes,
    puntosFocales: listValues(raw.puntos_focales),
    impactoEsperado: raw.impacto_esperado.value,
    responsabilidadFinanciera: responsabilidad ?? false,
    montoReferencial:
      raw.monto_referencial.value !== null && raw.monto_referencial.value !== undefined
        ? String(raw.monto_referencial.value)
        : null,
    observaciones: raw.observaciones.value,
    vigenciaTipo: raw.vigencia_tipo.value,
    confianza_extraccion: confianza,
    campos_dudosos: [...new Set(camposDudosos)],
    warnings: [...new Set(warningsAdded)],
  };

  return {
    normalized,
    rulesApplied,
    warningsAdded: [...new Set(warningsAdded)],
  };
}

function contrapartesAmbiguous(raw: DocumentExtractionRaw): boolean {
  const n = listValues(raw.contrapartes).length;
  const hasParte = !!(raw.parte_principal.value || "").trim();
  return n > 1 || (n === 1 && hasParte && norm(raw.parte_principal.value) !== norm(raw.contrapartes[0]?.value));
}
