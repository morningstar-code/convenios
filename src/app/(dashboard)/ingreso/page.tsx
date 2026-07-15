import Link from "next/link";
import { ArrowRight, Download, FileText, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllDocuments } from "@/repositories/document.repository";
import { getSession } from "@/lib/auth";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { getDocumentPublicUrl } from "@/lib/document-url";
import { IngresoUploader } from "@/features/documentos/components/ingreso-uploader";
import { ProcessDocButton } from "@/features/documentos/components/process-doc-button";

export const dynamic = "force-dynamic";

const RECENT_LIMIT = 8;

export default async function IngresoPage() {
  const [{ data: documents, total }, session] = await Promise.all([
    getAllDocuments({ limit: RECENT_LIMIT }),
    getSession(),
  ]);

  const isAdmin = session?.role === "admin";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Carga / Ingreso de MoUs</h1>
        <p className="text-sm text-slate-500 mt-1">
          Sube el PDF o DOCX del instrumento firmado. La IA extrae los campos, calcula la
          vigencia y crea el memorando con sus alertas. Tú solo revisas y validas.
        </p>
      </div>

      <IngresoUploader />

      {/* Documentos ya procesados — antes vivían en la sección "Documentos". */}
      {total > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-base">Documentos procesados</CardTitle>
            <span className="text-xs text-slate-500">
              {total} documento{total !== 1 ? "s" : ""} en total
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {documents.map((doc) => {
                const downloadHref = getDocumentPublicUrl(doc);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {doc.originalName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatBytes(doc.sizeBytes)} · {formatDateTime(doc.createdAt)}
                      </p>
                      {doc.convention && (
                        <Link
                          href={`/convenios/${doc.convention.id}`}
                          className="mt-0.5 flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          {doc.convention.contraparte.startsWith("[Pendiente]")
                            ? "Instrumento en proceso"
                            : doc.convention.contraparte}
                          {" · "}
                          {doc.convention.pais}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {doc.processedAt ? (
                        <Badge variant="success">
                          <Sparkles className="mr-1 h-3 w-3" />
                          Procesado
                        </Badge>
                      ) : doc.processingError ? (
                        <Badge variant="destructive" title={doc.processingError}>
                          Error
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="warning">Sin procesar</Badge>
                          {isAdmin && <ProcessDocButton documentId={doc.id} />}
                        </>
                      )}
                      {downloadHref && (
                        <a href={downloadHref} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" aria-label="Descargar documento">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {total > RECENT_LIMIT && (
              <div className="border-t border-slate-100 px-6 py-3">
                <Link
                  href="/convenios"
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  Ver todos los instrumentos registrados
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
