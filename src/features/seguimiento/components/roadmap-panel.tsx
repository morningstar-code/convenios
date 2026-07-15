"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  FileDown,
  Route as RouteIcon,
  CalendarClock,
  Users,
  ListChecks,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { downloadDocx } from "@/lib/download-docx";
import { groupByEspacio, type Roadmap } from "@/validators/roadmap.schema";

interface RoadmapMeta {
  modelo: string;
  createdAt: string;
  aceptado: boolean;
  generadoPor: string | null;
}

interface RoadmapPanelProps {
  conventionId: string;
  contraparte: string;
  roadmap: Roadmap | null;
  meta: RoadmapMeta | null;
  /** Sin resumen ejecutivo no hay hoja de ruta: se construye a partir de él. */
  hasSummary: boolean;
  isAdmin: boolean;
}

export function RoadmapPanel({
  conventionId,
  contraparte,
  roadmap,
  meta,
  hasSummary,
  isAdmin,
}: RoadmapPanelProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [instrucciones, setInstrucciones] = useState("");

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conventionId,
          instrucciones: instrucciones.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al generar");

      toast({
        title: "Hoja de ruta generada",
        description: "Revísala y expórtala a Word cuando esté conforme.",
        variant: "success",
      });
      router.refresh();
    } catch (err) {
      toast({
        title: "Error al generar la hoja de ruta",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const exportWord = async () => {
    setDownloading(true);
    try {
      await downloadDocx(
        `/api/ai/roadmap/export-word?conventionId=${conventionId}`,
        "hoja-de-ruta.docx"
      );
      toast({ title: "Hoja de ruta descargada", variant: "success" });
    } catch (err) {
      toast({
        title: "Error al descargar",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // ── Sin resumen ejecutivo ────────────────────────────────────────────────
  if (!hasSummary) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <RouteIcon className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            Primero el resumen ejecutivo
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
            La hoja de ruta se construye a partir del resumen: de ahí salen las áreas de
            cooperación, los compromisos y las fechas del instrumento.
          </p>
          <Link href={`/seguimiento?tab=resumen&mou=${conventionId}`}>
            <Button className="mt-4" variant="outline" size="sm">
              <Sparkles className="h-4 w-4" />
              Ir al resumen ejecutivo
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const espacios = roadmap ? groupByEspacio(roadmap.actividades) : [];

  return (
    <div className="space-y-4">
      {/* Generar */}
      {isAdmin && (
        <Card className="border-slate-200 bg-slate-50/60">
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1.5">
              <label
                htmlFor="roadmap-instrucciones"
                className="text-[10px] font-semibold uppercase tracking-[0.09em] text-slate-500"
              >
                Instrucciones (opcional)
              </label>
              <Textarea
                id="roadmap-instrucciones"
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                disabled={generating}
                rows={2}
                maxLength={1000}
                placeholder="Ej.: concentra los intercambios prioritarios en el primer semestre y deja el resto para 2027."
                className="resize-none bg-white"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-400">
                Se genera a partir del resumen ejecutivo de <strong>{contraparte}</strong>.
              </p>
              <Button
                size="sm"
                onClick={generate}
                disabled={generating}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando…
                  </>
                ) : roadmap ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" /> Regenerar hoja de ruta
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Generar hoja de ruta
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {generating && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
          <span>
            La IA está proponiendo las temáticas, los espacios de intercambio y el
            calendario… esto puede tomar 20-40 segundos.
          </span>
        </div>
      )}

      {!roadmap ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <RouteIcon className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No hay hoja de ruta aún</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
              {isAdmin
                ? "Genérala y obtendrás la propuesta metodológica de trabajo: temáticas, espacios de intercambio con fecha, coordinación y próximos pasos."
                : "Todavía nadie ha generado la hoja de ruta de este instrumento."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Documento */}
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-slate-900">
                    {roadmap.titulo}
                  </h2>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {roadmap.parte_propia} — {roadmap.parte_contraparte}
                  </p>
                </div>
                <Badge variant="info">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Generada del resumen
                </Badge>
                {meta && (
                  <span className="font-mono text-[10px] text-slate-400">
                    {meta.modelo} ·{" "}
                    {new Date(meta.createdAt).toLocaleDateString("es-ES")}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={exportWord} disabled={downloading}>
                  {downloading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando…
                    </>
                  ) : (
                    <>
                      <FileDown className="h-3.5 w-3.5" /> Exportar a Word
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4">
                <p className="max-w-[80ch] text-sm leading-relaxed text-slate-700">
                  {roadmap.introduccion}
                </p>
              </div>

              {/* Actividades */}
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <Th className="w-[20%]">Temática</Th>
                      <Th className="w-[28%]">Avances de cada entidad</Th>
                      <Th className="w-[16%]">Espacio de intercambio</Th>
                      <Th>Acciones / propuesta</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roadmap.actividades.map((a, i) => (
                      <tr key={i} className="align-top hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{a.tematica}</p>
                          {a.alineacion && (
                            <p className="mt-1 text-xs text-slate-500">{a.alineacion}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs leading-relaxed text-slate-600">
                          {a.avances.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            a.avances.map((av, j) => (
                              <p key={j} className={j > 0 ? "mt-1.5" : ""}>
                                <strong className="text-slate-800">{av.entidad}:</strong>{" "}
                                {av.detalle}
                              </p>
                            ))
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-semibold text-slate-900">
                            {a.espacio_tipo}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{a.espacio_fecha}</p>
                        </td>
                        <td className="px-4 py-3 text-xs leading-relaxed text-slate-600">
                          {a.acciones}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              {/* Resumen por espacio y fecha */}
              {espacios.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <PanelTitle icon={CalendarClock}>Resumen por espacio y fecha</PanelTitle>
                    <div className="mt-3 space-y-3">
                      {espacios.map((e, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="mt-1 flex flex-col items-center">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-blue-600 bg-white" />
                            {i < espacios.length - 1 && (
                              <span className="mt-1 w-px flex-1 bg-slate-200" />
                            )}
                          </div>
                          <div className="pb-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-blue-600">
                              {e.fecha}
                            </p>
                            <p className="text-sm font-semibold text-slate-900">{e.espacio}</p>
                            <p className="text-xs text-slate-500">{e.tematicas.join(" · ")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Seguimiento acordado */}
              {roadmap.seguimiento.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <PanelTitle icon={ListChecks}>Seguimiento acordado</PanelTitle>
                    <div className="mt-3 space-y-3">
                      {roadmap.seguimiento.map((h, i) => (
                        <div key={i}>
                          <p className="text-sm font-semibold text-slate-900">
                            {h.hito}
                            <span className="ml-1.5 font-normal text-slate-400">· {h.fecha}</span>
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                            {h.detalle}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              {/* Coordinación */}
              {roadmap.coordinacion.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <PanelTitle icon={Users}>Coordinación · Anexo I</PanelTitle>
                    <div className="mt-3 space-y-3">
                      {roadmap.coordinacion.map((c, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                            {c.entidad}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {c.contacto}
                          </p>
                          <dl className="mt-1 space-y-0.5 text-xs text-slate-600">
                            <ContactRow label="Cargo" value={c.cargo} />
                            <ContactRow label="Correo" value={c.correo} />
                            <ContactRow label="Teléfono" value={c.telefono} />
                          </dl>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Próximos pasos */}
              {roadmap.proximos_pasos.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <PanelTitle icon={RouteIcon}>Próximos pasos</PanelTitle>
                    <ol className="mt-3 space-y-2.5">
                      {roadmap.proximos_pasos.map((p, i) => (
                        <li key={i} className="flex gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white font-mono text-[10px] text-slate-500">
                            {i + 1}
                          </span>
                          <span className="text-xs leading-relaxed text-slate-700">{p}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <p className="px-1 text-xs text-slate-400">
            Borrador generado por IA. Verifícalo antes de remitirlo a la contraparte: las
            fechas y los contactos deben confirmarse con ella.
          </p>
        </>
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

function PanelTitle({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {children}
    </h3>
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex gap-1.5">
      <dt className="shrink-0 text-slate-400">{label}:</dt>
      <dd className="min-w-0 break-words text-slate-700">{value}</dd>
    </div>
  );
}
