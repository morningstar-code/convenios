/**
 * Arma la tabla comparativa de instrumentos, campo por campo.
 *
 * El primer instrumento seleccionado es la referencia: las celdas que se
 * apartan de él se marcan como diferencia. Hay campos donde diferir no
 * significa nada (la fecha de firma siempre es distinta), y esos no se marcan.
 */

import { INSTRUMENT_TYPE_LABELS, STATUS_LABELS } from "@/types";
import type { ConventionStatus, InstrumentType } from "@/types";
import { formatConvenioDuracionDisplay, formatDate } from "@/lib/utils";

/**
 * Máximo de instrumentos enfrentados a la vez. Vive aquí y no en el componente
 * del selector: ese lleva "use client", y todo lo que un componente de servidor
 * importe de un módulo cliente le llega como referencia, no como valor.
 */
export const MAX_COMPARE = 4;

export interface ComparableConvention {
  id: string;
  contraparte: string;
  pais: string;
  tipoInstrumento: string;
  estatus: string;
  validado: boolean;
  fechaFirma?: Date | string | null;
  fechaVencimientoCalculada?: Date | string | null;
  duracionTexto?: string | null;
  duracionMeses?: number | null;
  renovacionAutomatica?: boolean;
  diasPreaviso?: number | null;
  responsabilidadFinanciera?: boolean;
  puntoFocal?: string | null;
  areasCooperacion: string[];
  modalidadesCooperacion: string[];
  /** Se calcula aparte: si el instrumento ya tiene hoja de ruta generada. */
  tieneHojaDeRuta?: boolean;
}

export interface ComparisonCell {
  text: string;
  /** Cuando la celda es una lista (áreas, modalidades). */
  list?: string[];
  /** La celda se aparta del instrumento de referencia. */
  differs: boolean;
  /** Para pintar estado en vez de texto plano. */
  tone?: "ok" | "warn" | "muted";
}

export interface ComparisonRow {
  key: string;
  label: string;
  cells: ComparisonCell[];
}

const EMPTY = "—";

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildRow(
  key: string,
  label: string,
  conventions: ComparableConvention[],
  read: (c: ComparableConvention) => Omit<ComparisonCell, "differs">,
  opts: { comparable?: boolean } = {}
): ComparisonRow {
  const raw = conventions.map(read);
  const reference = raw[0];
  const comparable = opts.comparable !== false;

  return {
    key,
    label,
    cells: raw.map((cell, i) => ({
      ...cell,
      differs:
        comparable && i > 0 && reference != null && norm(cell.text) !== norm(reference.text),
    })),
  };
}

export function buildComparison(conventions: ComparableConvention[]): ComparisonRow[] {
  if (conventions.length === 0) return [];

  return [
    buildRow("tipo", "Tipo", conventions, (c) => ({
      text: INSTRUMENT_TYPE_LABELS[c.tipoInstrumento as InstrumentType] ?? c.tipoInstrumento,
    })),
    buildRow(
      "pais",
      "País",
      conventions,
      (c) => ({ text: c.pais || EMPTY }),
      { comparable: false }
    ),
    buildRow(
      "firma",
      "Fecha de firma",
      conventions,
      (c) => ({ text: c.fechaFirma ? formatDate(c.fechaFirma) : EMPTY }),
      // Que dos instrumentos se firmen en fechas distintas no es una diferencia.
      { comparable: false }
    ),
    buildRow(
      "vence",
      "Vencimiento",
      conventions,
      (c) => ({
        text: c.fechaVencimientoCalculada ? formatDate(c.fechaVencimientoCalculada) : "Indefinida",
      }),
      { comparable: false }
    ),
    buildRow("duracion", "Duración", conventions, (c) => ({
      text: formatConvenioDuracionDisplay(c.duracionTexto, c.duracionMeses),
    })),
    buildRow("renovacion", "Renovación", conventions, (c) => ({
      text: c.renovacionAutomatica ? "Automática" : "No automática",
    })),
    buildRow("preaviso", "Preaviso", conventions, (c) => ({
      text: c.diasPreaviso ? `${c.diasPreaviso} días` : EMPTY,
    })),
    buildRow("financiero", "Responsabilidad financiera", conventions, (c) => ({
      text: c.responsabilidadFinanciera ? "Sí" : "No genera obligaciones",
    })),
    buildRow("areas", "Áreas de cooperación", conventions, (c) => ({
      text: [...c.areasCooperacion].sort().join(", ") || EMPTY,
      list: c.areasCooperacion,
    })),
    buildRow("modalidades", "Modalidades", conventions, (c) => ({
      text: [...c.modalidadesCooperacion].sort().join(", ") || EMPTY,
      list: c.modalidadesCooperacion,
    })),
    buildRow("focal", "Punto focal", conventions, (c) => ({
      text: c.puntoFocal?.trim() || "Sin designar",
      tone: c.puntoFocal?.trim() ? undefined : "muted",
    })),
    buildRow("hoja", "Hoja de ruta", conventions, (c) => ({
      text: c.tieneHojaDeRuta ? "Generada" : "Sin generar",
      tone: c.tieneHojaDeRuta ? "ok" : "warn",
    })),
    buildRow("validado", "Validado", conventions, (c) => ({
      text: c.validado ? "Validado" : "Pendiente",
      tone: c.validado ? "ok" : "warn",
    })),
    buildRow("estatus", "Estatus", conventions, (c) => ({
      text: STATUS_LABELS[c.estatus as ConventionStatus] ?? c.estatus,
      tone: c.estatus === "vigente" ? "ok" : "warn",
    })),
  ];
}

/** Áreas que aparecen en más de un instrumento: el solapamiento real. */
export function findOverlappingAreas(conventions: ComparableConvention[]): string[] {
  const count = new Map<string, { label: string; n: number }>();

  for (const c of conventions) {
    const seen = new Set<string>();
    for (const area of c.areasCooperacion) {
      const key = norm(area);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const entry = count.get(key);
      if (entry) entry.n += 1;
      else count.set(key, { label: area, n: 1 });
    }
  }

  return [...count.values()]
    .filter((e) => e.n > 1)
    .sort((a, b) => b.n - a.n)
    .map((e) => e.label);
}
