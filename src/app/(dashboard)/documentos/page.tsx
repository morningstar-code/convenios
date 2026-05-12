import Link from "next/link";
import { FolderOpen, Download, FileText, Sparkles, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getAllDocuments } from "@/repositories/document.repository";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatBytes } from "@/lib/utils";
import type { ConventionStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { ProcessDocButton } from "@/features/documentos/components/process-doc-button";

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const [{ data: documents, total }, session] = await Promise.all([
    getAllDocuments({ limit: 100 }),
    getSession(),
  ]);

  const isAdmin = session?.role === "admin";

  const processed = documents.filter((d) => d.processedAt).length;
  const pending = documents.filter((d) => !d.processedAt && !d.processingError).length;
  const withError = documents.filter((d) => !!d.processingError).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documentos</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total} documento{total !== 1 ? "s" : ""} en el repositorio
          </p>
        </div>
        {isAdmin && (
          <Link href="/documentos/nuevo">
            <Button>
              <Sparkles className="h-4 w-4" />
              Procesar con IA
            </Button>
          </Link>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Procesados</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{processed}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Pendientes</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Con error</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{withError}</p>
        </div>
      </div>

      {/* CTA if no documents */}
      {isAdmin && total === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
          <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 mb-1">
            Empieza procesando un documento
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Sube un PDF o DOCX y la IA extraerá automáticamente todos los campos del instrumento.
          </p>
          <Link href="/documentos/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Subir y procesar primer documento
            </Button>
          </Link>
        </div>
      )}

      {/* Table */}
      {total > 0 && (
        <Card>
          <CardHeader className="py-4 px-6 border-b border-slate-100">
            <p className="text-sm text-slate-500">Repositorio documental</p>
          </CardHeader>
          <CardContent className="p-0">
            {documents.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="Sin documentos"
                description="No hay documentos subidos aún."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {doc.originalName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-xs text-slate-500">{formatBytes(doc.sizeBytes)}</p>
                          <span className="text-slate-300">·</span>
                          <p className="text-xs text-slate-500">{formatDateTime(doc.createdAt)}</p>
                        </div>
                        {doc.convention && (
                          <Link
                            href={`/convenios/${doc.convention.id}`}
                            className="text-xs text-blue-600 hover:underline mt-0.5 flex items-center gap-1"
                          >
                            {doc.convention.contraparte.startsWith("[Pendiente]")
                              ? "Instrumento en proceso"
                              : doc.convention.contraparte}
                            {" "}· {doc.convention.pais}
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {doc.processedAt ? (
                        <Badge variant="success">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Procesado
                        </Badge>
                      ) : doc.processingError ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="warning">Pendiente</Badge>
                          {isAdmin && (
                            <ProcessDocButton documentId={doc.id} />
                          )}
                        </div>
                      )}

                      {doc.convention && (
                        <StatusBadge status={doc.convention.estatus as ConventionStatus} />
                      )}

                      <a href={doc.blobUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
