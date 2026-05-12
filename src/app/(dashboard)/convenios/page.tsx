import Link from "next/link";
import { ExternalLink, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { findManyConventions } from "@/repositories/convention.repository";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { resolveFechaFirmaForDisplay } from "@/lib/convention-fecha-display";
import { ConventionFiltersBar } from "@/features/convenios/components/convention-filters-bar";
import { getSession } from "@/lib/auth";
import type { ConventionStatus, InstrumentType } from "@/types";
import { INSTRUMENT_TYPE_LABELS } from "@/types";

export const dynamic = "force-dynamic";

function inferOrganismoFromPdfName(filename?: string | null): string | null {
  if (!filename) return null;

  const cleaned = filename
    .replace(/\.[^.]+$/, "")
    .replace(/\(\d+\)\s*$/, "")
    .replace(/_/g, "-");

  const directMatch = cleaned.match(/indotel[-\s]+([a-z0-9]+)/i);
  if (directMatch) {
    return directMatch[1].toUpperCase();
  }

  const tokens = cleaned.split(/[-\s]+/).filter(Boolean);
  const skip = new Set([
    "memorandum",
    "memorando",
    "entendimiento",
    "entre",
    "acuerdo",
    "cooperacion",
    "instrumento",
    "de",
    "del",
    "la",
    "el",
    "y",
    "pdf",
    "doc",
    "docx",
    "indotel",
  ]);

  const idx = tokens.findIndex((token) => /^indotel$/i.test(token));
  if (idx >= 0) {
    for (let i = idx + 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (!skip.has(token.toLowerCase())) return token.toUpperCase();
    }
  }

  return null;
}

interface PageProps {
  searchParams: Promise<{
    search?: string;
    pais?: string;
    estatus?: string;
    tipoInstrumento?: string;
    porVencer?: string;
    anio?: string;
    page?: string;
    orderBy?: string;
    order?: string;
  }>;
}

export default async function ConveniosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSession();

  const parsedAnio = params.anio ? Number.parseInt(params.anio, 10) : undefined;
  const anioFirma =
    parsedAnio !== undefined &&
    Number.isFinite(parsedAnio) &&
    parsedAnio >= 1900 &&
    parsedAnio <= 2200
      ? parsedAnio
      : undefined;

  const filter = {
    search: params.search,
    pais: params.pais,
    estatus: params.estatus as ConventionStatus | undefined,
    tipoInstrumento: params.tipoInstrumento as InstrumentType | undefined,
    porVencer: params.porVencer as "30" | "60" | "90" | undefined,
    anioFirma,
    page: params.page ? parseInt(params.page) : 1,
    limit: 20,
    orderBy: (params.orderBy as "fechaFirma" | "fechaVencimientoCalculada" | "createdAt" | "contraparte") || "fechaFirma",
    order: (params.order as "asc" | "desc") || "desc",
  };

  const { data: conventions, total, page, limit } = await findManyConventions(filter);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Memorandos / Acuerdos de Cooperación</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total} instrumento{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        {session?.role === "admin" && (
          <Link href="/convenios/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo memorando o acuerdo
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <ConventionFiltersBar currentParams={params} />

      {/* Table */}
      <Card>
        <CardHeader className="py-4 px-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Mostrando {conventions.length} de {total} resultados
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {conventions.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No se encontraron memorandos o acuerdos"
              description="Prueba ajustando los filtros de búsqueda o registra un nuevo instrumento."
              action={
                session?.role === "admin" ? (
                  <Link href="/convenios/nuevo">
                    <Button>
                      <Plus className="h-4 w-4" />
                      Nuevo memorando o acuerdo
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">
                        No.
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Nombre del instrumento
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Organismo
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Tipo
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        Fecha de firma
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Estatus
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[200px] max-w-xs">
                        Condición de terminación
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Validado
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Hyperlink
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Docs
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {conventions.map((conv, index) => {
                      const pdfName = conv.documents?.[0]?.originalName;
                      const rowNumber = (page - 1) * limit + index + 1;
                      const organismoFallback = inferOrganismoFromPdfName(pdfName);
                      const organismo =
                        /indotel/i.test(conv.contraparte) && organismoFallback
                          ? organismoFallback
                          : conv.contraparte;

                      return (
                      <tr
                        key={conv.id}
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        <td className="px-6 py-4 align-top">
                          <span className="text-sm font-semibold text-slate-500 tabular-nums">
                            {rowNumber}.
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <div>
                              <Link href={`/convenios/${conv.id}`} className="block">
                                <p className="text-sm font-medium text-slate-900 group-hover:text-slate-700">
                                  {conv.documents?.[0]?.originalName || "Sin PDF adjunto"}
                                </p>
                              </Link>
                              {conv.codigoInterno && (
                                <p className="text-xs text-slate-400 font-mono">{conv.codigoInterno}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <Link href={`/convenios/${conv.id}`} className="block">
                              <p className="text-sm font-medium text-slate-900 group-hover:text-slate-700">
                                {organismo}
                              </p>
                            </Link>
                            <p className="text-xs text-slate-500 mt-0.5">{conv.pais}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-slate-600">
                            {INSTRUMENT_TYPE_LABELS[conv.tipoInstrumento as InstrumentType]}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs text-slate-600">
                            {formatDate(resolveFechaFirmaForDisplay(conv.fechaFirma, conv.drafts))}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={conv.estatus as ConventionStatus} />
                        </td>
                        <td className="px-4 py-4 max-w-[280px]">
                          {conv.condicionTerminacion?.trim() ? (
                            <p
                              className="text-xs text-slate-600 line-clamp-3 leading-relaxed"
                              title={conv.condicionTerminacion}
                            >
                              {conv.condicionTerminacion}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {conv.validado ? (
                            <Badge variant="success">Validado</Badge>
                          ) : (
                            <Badge variant="outline">Pendiente</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {conv.documents?.[0] ? (
                            <a
                              href={conv.documents[0].blobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                              title={conv.documents[0].originalName}
                            >
                              Hyperlink
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-slate-500">
                            {conv._count?.documents || 0}
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link href={`/convenios?${new URLSearchParams({ ...params, page: String(page - 1) })}`}>
                        <Button variant="outline" size="sm">Anterior</Button>
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link href={`/convenios?${new URLSearchParams({ ...params, page: String(page + 1) })}`}>
                        <Button variant="outline" size="sm">Siguiente</Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
