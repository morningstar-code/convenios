/**
 * Ficha técnica determinista generada solo desde el objeto normalizado.
 * No inventa datos: usa "Pendiente de validación" donde falte información.
 */

import type { NormalizedConventionPayload } from "@/validators/document-extraction.schema";
import type { DocumentExtractionRaw } from "@/validators/document-extraction.schema";
import { formatDate, formatConvenioDuracionDisplay } from "@/lib/utils";

const HDR =
  "*** BORRADOR — Resumen ejecutivo generado desde extracción estructurada. Requiere validación humana. ***\n\n";

function line(label: string, value: string | null | undefined): string {
  const v =
    value !== null && value !== undefined && String(value).trim() !== ""
      ? String(value).trim()
      : "Pendiente de validación";
  return `${label}: ${v}`;
}

function listSection(title: string, items: string[]): string {
  if (!items.length) return `${title}\n  (Pendiente de validación)\n`;
  return `${title}\n${items.map((x) => `  • ${x}`).join("\n")}\n`;
}

/** Optional: append evidence snippets for audit (no invention — only what was extracted) */
function evidenceAppendix(raw: DocumentExtractionRaw | null): string {
  if (!raw) return "";
  const lines: string[] = ["\n--- ANEXO: EVIDENCIA EXTRAÍDA (IA) ---\n"];
  const fields: [string, { evidence: { text: string | null; page: number | null } | null }][] = [
    ["nombre_convenio", raw.nombre_convenio],
    ["tipo_instrumento", raw.tipo_instrumento],
    ["parte_principal", raw.parte_principal],
    ["fecha_firma", raw.fecha_firma],
    ["objetivo", raw.objetivo],
    ["vigencia_tipo", raw.vigencia_tipo],
    ["condicion_terminacion", raw.condicion_terminacion],
  ];
  for (const [name, f] of fields) {
    const ev = f.evidence;
    if (ev?.text) {
      lines.push(
        `[${name}] pág. ${ev.page ?? "—"}: ${ev.text.slice(0, 500)}${ev.text.length > 500 ? "…" : ""}`
      );
    }
  }
  if (lines.length === 1) return "";
  return lines.join("\n") + "\n";
}

export function renderFichaTecnicaFromNormalized(
  n: NormalizedConventionPayload,
  raw?: DocumentExtractionRaw | null
): string {
  let out = HDR;

  out += "IDENTIFICACIÓN\n";
  out += line("Nombre del instrumento / convenio", n.nombreConvenio) + "\n";
  out += line("Tipo de instrumento (normalizado)", n.tipoInstrumento) + "\n";
  out += line("Estatus documental estimado", n.estatus) + "\n";
  out += line("Confianza global extracción", `${Math.round(n.confianza_extraccion * 100)}%`) + "\n\n";

  out += "PARTES\n";
  out += line("Parte principal (según documento)", n.partePrincipal) + "\n";
  out += line("Contraparte (registro principal)", n.contraparte) + "\n";
  out += line("Países relacionados", n.pais) + "\n\n";

  out += listSection("FIRMANTES (no equivalentes a punto focal)", n.firmantes);
  out += "\n";

  out += "CONTACTO OPERATIVO\n";
  out += line("Punto focal / contacto", n.puntoFocal) + "\n";
  out += line("Cargo", n.cargoPuntoFocal) + "\n";
  out += line("Correo", n.correoPuntoFocal) + "\n";
  out += listSection("Puntos focales listados en documento", n.puntosFocales);
  out += "\n";

  out += "OBJETO Y COOPERACIÓN\n";
  out += line("Objeto", n.objetivo) + "\n";
  out += listSection("Áreas de cooperación", n.areasCooperacion);
  out += listSection("Modalidades de cooperación", n.modalidadesCooperacion);
  out += listSection("Actividades", n.actividades);
  out += line("Impacto esperado", n.impactoEsperado) + "\n\n";

  out += "VIGENCIA Y TERMINACIÓN\n";
  out += line("Tipo de vigencia (documental)", n.vigenciaTipo) + "\n";
  out += line("Fecha de firma", n.fechaFirma ? formatDate(n.fechaFirma) : null) + "\n";
  out +=
    `Duración (texto): ${formatConvenioDuracionDisplay(n.duracionTexto, n.duracionMeses)}\n`;
  out += line("Duración (meses)", n.duracionMeses !== null ? String(n.duracionMeses) : null) + "\n";
  out += line(
    "Fecha de vencimiento calculada",
    n.fechaVencimientoCalculada ? formatDate(n.fechaVencimientoCalculada) : null
  ) + "\n";
  out += line("Renovación automática", n.renovacionAutomatica ? "Sí" : "No") + "\n";
  out += line("Condición de terminación", n.condicionTerminacion) + "\n";
  out += line("Días de preaviso", n.diasPreaviso !== null ? String(n.diasPreaviso) : null) + "\n\n";

  out += "ASPECTOS FINANCIEROS\n";
  out += line("Responsabilidad financiera", n.responsabilidadFinanciera ? "Sí" : "No") + "\n";
  out += line("Monto referencial", n.montoReferencial) + "\n\n";

  out += listSection("Direcciones / unidades involucradas", n.direccionesInvolucradas);
  out += "\n";

  out += "OBSERVACIONES\n";
  out += line("Observaciones extraídas", n.observaciones) + "\n\n";

  if (n.campos_dudosos.length) {
    out += "CAMPOS DUDOSOS\n";
    out += n.campos_dudosos.map((c) => `  • ${c}`).join("\n") + "\n\n";
  }
  if (n.warnings.length) {
    out += "ADVERTENCIAS\n";
    out += n.warnings.map((w) => `  • ${w}`).join("\n") + "\n\n";
  }

  out += evidenceAppendix(raw ?? null);

  return out;
}
