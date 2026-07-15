/**
 * Convierte los campos guardados del instrumento en la estructura FichaConvenio,
 * para reutilizar la plantilla Word institucional (`fichaToDocx`) al exportar la
 * ficha técnica desde la pantalla "3 · Ficha técnica".
 *
 * Ojo: esto NO es el resumen ejecutivo de IA. Aquí no se inventa ni se redacta
 * nada; solo se formatean los datos que ya están validados en la base.
 */

import type { FichaConvenio } from "@/lib/openai";
import { INSTRUMENT_TYPE_LABELS, STATUS_LABELS } from "@/types";
import type { ConventionStatus, InstrumentType } from "@/types";
import { formatConvenioDuracionDisplay, formatDate } from "@/lib/utils";

const NO_DATA = "[Dato no disponible en el documento]";

export interface ConventionForFicha {
  contraparte: string;
  pais: string;
  codigoInterno?: string | null;
  tipoInstrumento: string;
  estatus: string;
  fechaFirma?: Date | string | null;
  duracionTexto?: string | null;
  duracionMeses?: number | null;
  renovacionAutomatica?: boolean;
  diasPreaviso?: number | null;
  condicionTerminacion?: string | null;
  puntoFocal: string;
  cargoPuntoFocal?: string | null;
  correoPuntoFocal?: string | null;
  direccionesInvolucradas: string[];
  objetivo: string;
  modalidadesCooperacion: string[];
  areasCooperacion: string[];
  impactoEsperado?: string | null;
  responsabilidadFinanciera?: boolean;
  montoReferencial?: unknown;
  observaciones?: string | null;
  conclusionInterna?: string | null;
}

function bulletList(items: string[]): string {
  const clean = items.map((i) => i.trim()).filter(Boolean);
  if (clean.length === 0) return NO_DATA;
  return clean.map((i) => `• ${i}`).join("\n");
}

function text(value: string | null | undefined): string {
  const t = (value ?? "").trim();
  return t || NO_DATA;
}

function buildPuntoFocal(c: ConventionForFicha): string {
  const parts = [c.puntoFocal?.trim(), c.cargoPuntoFocal?.trim()].filter(Boolean);
  let out = parts.join(", ");
  if (c.correoPuntoFocal?.trim()) {
    out = out ? `${out} (${c.correoPuntoFocal.trim()})` : c.correoPuntoFocal.trim();
  }
  return out || NO_DATA;
}

function buildVigencia(c: ConventionForFicha): string {
  const base = formatConvenioDuracionDisplay(c.duracionTexto, c.duracionMeses);
  const extras: string[] = [];
  if (c.renovacionAutomatica) extras.push("con renovación automática");
  if (c.diasPreaviso) extras.push(`preaviso de ${c.diasPreaviso} días`);
  return extras.length ? `${base} — ${extras.join(", ")}` : base;
}

function buildFinanciera(c: ConventionForFicha): string {
  if (!c.responsabilidadFinanciera) {
    return "El instrumento no contempla obligaciones financieras entre las partes.";
  }
  const monto = c.montoReferencial != null ? String(c.montoReferencial) : "";
  return monto
    ? `El instrumento sí contempla responsabilidad financiera. Monto referencial registrado: ${monto}.`
    : "El instrumento sí contempla responsabilidad financiera. No hay un monto referencial registrado en el sistema.";
}

function buildConclusion(c: ConventionForFicha): string {
  const parts = [c.conclusionInterna?.trim(), c.observaciones?.trim()].filter(Boolean);
  return parts.length ? parts.join("\n\n") : NO_DATA;
}

export function conventionToFicha(
  c: ConventionForFicha,
  opts?: { nombreDocumento?: string | null; enlace?: string | null }
): FichaConvenio {
  const tipoLabel =
    INSTRUMENT_TYPE_LABELS[c.tipoInstrumento as InstrumentType] ?? c.tipoInstrumento;

  const nombre =
    opts?.nombreDocumento?.replace(/\.(pdf|docx?|rtf)$/i, "").trim() ||
    `${tipoLabel} con ${c.contraparte} (${c.pais})`;

  return {
    nombreDocumento: nombre,
    tipoInstrumento: tipoLabel,
    fechaFirma: c.fechaFirma ? formatDate(c.fechaFirma) : NO_DATA,
    duracion: buildVigencia(c),
    estatus: STATUS_LABELS[c.estatus as ConventionStatus] ?? c.estatus,
    condicionTerminacion: text(c.condicionTerminacion),
    puntoFocal: buildPuntoFocal(c),
    direccionesInvolucradas: c.direccionesInvolucradas.length
      ? c.direccionesInvolucradas.join("\n")
      : NO_DATA,
    enlace: text(opts?.enlace ?? c.codigoInterno),
    objetivo: text(c.objetivo),
    modalidadesCooperacion: bulletList(c.modalidadesCooperacion),
    // El modelo de datos no guarda actividades ni temas sugeridos por separado:
    // esos apartados los desarrolla el resumen ejecutivo con IA.
    actividades: NO_DATA,
    areasCooperacion: bulletList(c.areasCooperacion),
    temasSugeridos: NO_DATA,
    responsabilidadFinanciera: buildFinanciera(c),
    impactoEsperado: text(c.impactoEsperado),
    conclusion: buildConclusion(c),
  };
}
