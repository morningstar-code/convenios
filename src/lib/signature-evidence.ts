/**
 * Saca del resultado crudo de la extracción la cita del documento donde la IA
 * leyó la fecha de firma (página + texto), para poder contrastarla con el PDF.
 * Lo usan la ficha técnica y el resumen ejecutivo.
 */

import { getDocumentPublicUrl } from "@/lib/document-url";
import type { SignatureEvidence } from "@/features/convenios/components/signature-evidence-dialog";

type DocumentRef = {
  blobUrl: string;
  blobPathname: string;
  originalName: string;
} | undefined;

export function extractSignatureEvidence(
  aiResult: unknown,
  latestDocument: DocumentRef
): SignatureEvidence | undefined {
  if (!aiResult || typeof aiResult !== "object" || Array.isArray(aiResult)) return undefined;

  const raw = (aiResult as { raw?: unknown }).raw;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const fechaFirma = (raw as { fecha_firma?: unknown }).fecha_firma;
  if (!fechaFirma || typeof fechaFirma !== "object" || Array.isArray(fechaFirma)) {
    return undefined;
  }

  const evidence = (fechaFirma as { evidence?: unknown }).evidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return undefined;

  const page = (evidence as { page?: unknown }).page;
  const text = (evidence as { text?: unknown }).text;

  if (typeof text !== "string" && typeof page !== "number") return undefined;

  return {
    page: typeof page === "number" ? page : null,
    text: typeof text === "string" ? text : null,
    documentUrl: getDocumentPublicUrl(latestDocument),
    documentLabel: latestDocument?.originalName,
  };
}
