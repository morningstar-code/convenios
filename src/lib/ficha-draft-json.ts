/**
 * Parse `ConventionDraft.contenido` which should be a JSON object, but may be
 * double-stringified or use alternate field names.
 */

export function parseDraftContenidoObject(contenido: string): Record<string, unknown> | null {
  try {
    let v: unknown = JSON.parse(contenido);
    if (typeof v === "string") {
      v = JSON.parse(v);
    }
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    return v as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function pickFechaFirmaTextFromDraftRecord(record: Record<string, unknown>): string | undefined {
  for (const key of ["fechaFirma", "fecha_firma"]) {
    const v = record[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}
