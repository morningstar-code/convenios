import { parseFichaDate } from "@/lib/ficha-date-parse";
import { parseDraftContenidoObject, pickFechaFirmaTextFromDraftRecord } from "@/lib/ficha-draft-json";

type DraftSnippet = { contenido: string };

/**
 * Prefer canonical DB value; if missing, parse the latest executive-summary draft
 * so list/detail match what the user sees under Automatización IA.
 */
export function resolveFechaFirmaForDisplay(
  fechaFirma: Date | null | undefined,
  drafts: DraftSnippet[] | null | undefined
): Date | null {
  if (fechaFirma) return fechaFirma;
  const raw = drafts?.[0]?.contenido;
  if (!raw) return null;
  const record = parseDraftContenidoObject(raw);
  if (!record) return null;
  const text = pickFechaFirmaTextFromDraftRecord(record);
  return text ? parseFichaDate(text) : null;
}
