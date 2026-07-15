import Link from "next/link";
import { Bell, Radar, Sparkles, Route as RouteIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import {
  findConventionById,
  findConventionPickList,
  findMostRecentConventionId,
} from "@/repositories/convention.repository";
import { findAIOutputsByConvention } from "@/repositories/ai-output.repository";
import { findLatestRoadmap } from "@/repositories/roadmap.repository";
import { extractSignatureEvidence } from "@/lib/signature-evidence";
import { getDocumentPublicUrl } from "@/lib/document-url";
import { AIPanel } from "@/features/convenios/components/ai-panel";
import { ConventionSwitcher } from "@/features/convenios/components/convention-switcher";
import { RoadmapPanel } from "@/features/seguimiento/components/roadmap-panel";
import { AlertsPanel } from "@/features/seguimiento/components/alerts-panel";
import {
  SEGUIMIENTO_TABS,
  SEGUIMIENTO_TAB_LABELS,
  parseSeguimientoTab,
  type SeguimientoTab,
} from "@/types";

export const dynamic = "force-dynamic";

const TAB_ICONS: Record<SeguimientoTab, React.ElementType> = {
  resumen: Sparkles,
  "hoja-de-ruta": RouteIcon,
  alertas: Bell,
};

interface PageProps {
  searchParams: Promise<{
    mou?: string;
    tab?: string;
    atendida?: string;
  }>;
}

/**
 * "4 · Seguimiento" — qué se acordó, qué toca hacer y qué está por vencer.
 * Tres secciones encadenadas: el resumen ejecutivo alimenta la hoja de ruta,
 * y las alertas avisan de lo que vence. Antes vivían repartidas entre las
 * pestañas de la ficha y un ítem suelto del menú.
 */
export default async function SeguimientoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = parseSeguimientoTab(params.tab);
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  // Las alertas son de toda la cartera; el resumen y la hoja de ruta, de un MoU.
  const needsConvention = tab !== "alertas";

  const [pickList, fallbackId] = await Promise.all([
    findConventionPickList(),
    findMostRecentConventionId(),
  ]);

  const selectedId =
    params.mou && pickList.some((c) => c.id === params.mou) ? params.mou : fallbackId;

  const convention = needsConvention && selectedId ? await findConventionById(selectedId) : null;

  const [aiOutputs, storedRoadmap] = convention
    ? await Promise.all([
        findAIOutputsByConvention(convention.id),
        tab === "hoja-de-ruta" ? findLatestRoadmap(convention.id) : Promise.resolve(null),
      ])
    : [[], null];

  const latestDocument = convention
    ? [...convention.documents].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
    : undefined;

  const latestAI = aiOutputs.find((o) => o.tipo === "extraccion");
  const signatureEvidence = extractSignatureEvidence(latestAI?.resultado, latestDocument);

  const drafts = convention?.drafts ?? [];
  const fichaDrafts = drafts.filter(
    (d) => d.tipo === "ficha_tecnica" || d.tipo === "resumen_ejecutivo"
  );
  const hasSummary = fichaDrafts.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Seguimiento de MoUs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Qué se acordó, qué toca hacer y qué está por vencer.
          </p>
        </div>
        {needsConvention && convention && (
          <ConventionSwitcher
            conventions={pickList}
            currentId={convention.id}
            hrefTemplate={`/seguimiento?tab=${tab}&mou=:id`}
          />
        )}
      </div>

      {/* Pestañas — el estado vive en la URL para que el menú lateral lo marque */}
      <div
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100/70 p-1"
        role="tablist"
      >
        {SEGUIMIENTO_TABS.map((t, i) => {
          const Icon = TAB_ICONS[t];
          const isActive = t === tab;
          const href =
            t === "alertas"
              ? "/seguimiento?tab=alertas"
              : `/seguimiento?tab=${t}${selectedId ? `&mou=${selectedId}` : ""}`;
          return (
            <Link
              key={t}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  isActive ? "text-blue-600" : "text-slate-400"
                )}
              >
                {i + 1}
              </span>
              <Icon className="h-3.5 w-3.5" />
              {SEGUIMIENTO_TAB_LABELS[t]}
            </Link>
          );
        })}
      </div>

      {/* Contenido */}
      {needsConvention && !convention ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Radar}
              title="Todavía no hay nada que seguir"
              description="El seguimiento se apoya en un memorando ya registrado. Carga el primero y la IA lo dejará listo para resumir."
              action={
                <Link href="/ingreso">
                  <Button>
                    <Upload className="h-4 w-4" />
                    Cargar el primer MoU
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : tab === "resumen" && convention ? (
        <AIPanel
          conventionId={convention.id}
          drafts={fichaDrafts as Parameters<typeof AIPanel>[0]["drafts"]}
          isAdmin={isAdmin}
          signatureEvidence={signatureEvidence}
          documentReference={
            latestDocument
              ? {
                  url: getDocumentPublicUrl(latestDocument) ?? latestDocument.blobUrl,
                  label: latestDocument.originalName,
                }
              : undefined
          }
        />
      ) : tab === "hoja-de-ruta" && convention ? (
        <RoadmapPanel
          conventionId={convention.id}
          contraparte={convention.contraparte}
          roadmap={storedRoadmap?.roadmap ?? null}
          meta={
            storedRoadmap
              ? {
                  modelo: storedRoadmap.modelo,
                  createdAt: storedRoadmap.createdAt.toISOString(),
                  aceptado: storedRoadmap.aceptado,
                  generadoPor: storedRoadmap.generadoPor,
                }
              : null
          }
          hasSummary={hasSummary}
          isAdmin={isAdmin}
        />
      ) : (
        <AlertsPanel
          atendida={params.atendida === "true"}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
