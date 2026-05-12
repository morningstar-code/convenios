"use client";

import { ExternalLink, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface SignatureEvidence {
  page: number | null;
  text: string | null;
  documentUrl?: string;
  documentLabel?: string;
}

interface SignatureEvidenceDialogProps {
  evidence: SignatureEvidence;
}

function buildPdfUrl(url: string | undefined, page: number): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const base = isLocalhost ? parsed.pathname : parsed.toString().split("#")[0];
    return `${base}#page=${page}`;
  } catch {
    return `${url}#page=${page}`;
  }
}

export function SignatureEvidenceDialog({ evidence }: SignatureEvidenceDialogProps) {
  const page = evidence.page ?? 1;
  const pdfUrl = buildPdfUrl(evidence.documentUrl, page);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50"
          title="Ver evidencia de la fecha de firma"
        >
          <ImageIcon className="h-4 w-4" />
          <span className="sr-only">Ver evidencia de la fecha de firma</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] lg:max-w-[min(100vw-2rem,1200px)]">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-3">
          <DialogTitle className="text-base sm:text-lg">Evidencia de fecha de firma</DialogTitle>
          <DialogDescription>
            Fragmento usado por la IA para identificar la fecha.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {pdfUrl && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <iframe
                src={pdfUrl}
                title="Página del PDF con la evidencia de firma"
                className="h-[min(70vh,800px)] min-h-[360px] w-full"
              />
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Evidencia {evidence.page != null ? `(pág. ${evidence.page})` : ""}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {evidence.text || "No hay evidencia textual guardada para esta fecha."}
            </p>
          </div>

          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Abrir PDF en la página {page}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
