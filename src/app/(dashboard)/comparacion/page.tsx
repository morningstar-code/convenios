import Link from "next/link";
import { ExternalLink, FolderOpen, GitCompare, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  findConventionPickList,
  findConventionsByIds,
} from "@/repositories/convention.repository";
import { findConventionIdsWithRoadmap } from "@/repositories/roadmap.repository";
import { MAX_COMPARE, buildComparison, findOverlappingAreas } from "@/lib/comparison";
import { ComparisonPicker } from "@/features/comparacion/components/comparison-picker";
import { ComparisonAIPanel } from "@/features/comparacion/components/comparison-ai-panel";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

/**
 * "5 · Comparación de MoUs" — enfrenta instrumentos campo por campo para ver
 * qué se repite, qué falta y qué se contradice. El botón del Drive abre la
 * carpeta donde viven los originales (DRIVE_FOLDER_URL).
 */
export default async function ComparacionPage({ searchParams }: PageProps) {
  const { ids } = await searchParams;

  const pickList = await findConventionPickList();
  const validIds = new Set(pickList.map((c) => c.id));

  const selected = (ids?.split(",") ?? [])
    .map((s) => s.trim())
    .filter((s) => s && validIds.has(s))
    .slice(0, MAX_COMPARE);

  const [conventions, withRoadmap] = await Promise.all([
    findConventionsByIds(selected),
    findConventionIdsWithRoadmap(selected),
  ]);

  const comparable = conventions.map((c) => ({
    ...c,
    montoReferencial: undefined,
    tieneHojaDeRuta: withRoadmap.has(c.id),
  }));

  const rows = buildComparison(comparable);
  const overlapping = findOverlappingAreas(comparable);
  const driveUrl = process.env.DRIVE_FOLDER_URL;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comparación de MoUs</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Enfrenta instrumentos campo por campo para ver qué se repite, qué falta y qué se
            contradice.
          </p>
        </div>
        {driveUrl && (
          <a href={driveUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <FolderOpen className="h-4 w-4" />
              Abrir carpeta en Drive
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          </a>
        )}
      </div>

      {pickList.length < 2 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={GitCompare}
              title="Hacen falta al menos dos instrumentos"
              description="La comparación necesita dos o más memorandos registrados. Carga otro y podrás enfrentarlos campo por campo."
              action={
                <Link href="/ingreso">
                  <Button>
                    <Upload className="h-4 w-4" />
                    Cargar un MoU
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selector */}
          <Card>
            <CardContent className="p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.09em] text-slate-500">
                Instrumentos a comparar · máximo {MAX_COMPARE}
              </p>
              <ComparisonPicker conventions={pickList} selected={selected} />
            </CardContent>
          </Card>

          {conventions.length < 2 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <GitCompare className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">
                  Elige al menos dos instrumentos
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  El primero que elijas hace de referencia: las diferencias se marcan
                  respecto de él.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Tabla comparativa */}
              <Card>
                <CardContent className="p-0">
                  <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
                    <h2 className="text-base font-semibold text-slate-900">
                      Comparación de {conventions.length} instrumentos
                    </h2>
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="inline-block h-3 w-3 rounded-sm border border-amber-200 bg-amber-50" />
                      Se aparta de <strong>{conventions[0].contraparte}</strong>
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="w-[150px] px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Campo
                          </th>
                          {conventions.map((c, i) => (
                            <th
                              key={c.id}
                              className="px-4 py-2.5 text-left text-xs font-semibold text-slate-900"
                            >
                              <Link href={`/convenios/${c.id}`} className="hover:underline">
                                {c.contraparte}
                              </Link>
                              <span className="ml-1.5 font-normal text-slate-400">
                                {c.pais}
                              </span>
                              {i === 0 && (
                                <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600">
                                  Referencia
                                </span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((row) => (
                          <tr key={row.key} className="align-top">
                            <td className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                              {row.label}
                            </td>
                            {row.cells.map((cell, i) => (
                              <td
                                key={i}
                                className={cn(
                                  "px-4 py-3",
                                  cell.differs && "bg-amber-50/70"
                                )}
                              >
                                {cell.list && cell.list.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {cell.list.map((item, j) => (
                                      <span
                                        key={j}
                                        className={cn(
                                          "rounded-full border px-2 py-0.5 text-[11px]",
                                          overlapping.some(
                                            (o) =>
                                              o.toLowerCase() === item.toLowerCase()
                                          )
                                            ? "border-blue-200 bg-blue-50 text-blue-700"
                                            : "border-slate-200 bg-slate-50 text-slate-600"
                                        )}
                                      >
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span
                                    className={cn(
                                      "text-xs",
                                      cell.tone === "ok"
                                        ? "font-medium text-emerald-700"
                                        : cell.tone === "warn"
                                        ? "font-medium text-amber-700"
                                        : cell.tone === "muted"
                                        ? "text-slate-400"
                                        : "text-slate-700"
                                    )}
                                  >
                                    {cell.text}
                                  </span>
                                )}
                                {cell.differs && (
                                  <span
                                    className="ml-1.5 align-top font-mono text-[10px] text-amber-600"
                                    title={`Se aparta de ${conventions[0].contraparte}`}
                                  >
                                    ≠
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {overlapping.length > 0 && (
                    <div className="border-t border-slate-100 bg-blue-50/40 px-4 py-3">
                      <p className="text-xs text-slate-600">
                        <strong className="text-blue-700">
                          {overlapping.length} área
                          {overlapping.length !== 1 ? "s" : ""} en común
                        </strong>{" "}
                        entre los instrumentos seleccionados: {overlapping.join(", ")}.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lectura con IA */}
              <ComparisonAIPanel ids={conventions.map((c) => c.id)} />
            </>
          )}
        </>
      )}
    </div>
  );
}
