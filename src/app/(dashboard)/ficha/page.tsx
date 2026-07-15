import Link from "next/link";
import { ArrowLeft, ClipboardList, Layers, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  findConventionPickList,
  findConventionsByIds,
} from "@/repositories/convention.repository";
import { FichaPicker } from "@/features/convenios/components/ficha-picker";
import { FichaPrintSheet } from "@/features/convenios/components/ficha-print-sheet";
import { PrintButton } from "@/features/convenios/components/print-button";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ ver?: string }>;
}

/**
 * "3 · Ficha técnica" — la sección pregunta lo mismo que preguntaría una
 * persona: ¿todas o una en particular? Las fichas se imprimen para la carpeta
 * física, así que "todas" es una tirada lista para el papel.
 */
export default async function FichaPage({ searchParams }: PageProps) {
  const { ver } = await searchParams;
  const conventions = await findConventionPickList();

  if (conventions.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-0">
          <EmptyState
            icon={ClipboardList}
            title="Todavía no hay ninguna ficha"
            description="La ficha técnica se arma sola cuando cargas un memorando o acuerdo: la IA extrae los campos del documento y los deja listos para tu revisión."
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
    );
  }

  // ── Todas las fichas, listas para imprimir ──────────────────────────────
  if (ver === "todas") {
    const all = await findConventionsByIds(conventions.map((c) => c.id));

    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Fichas técnicas · todas
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {all.length} ficha{all.length !== 1 ? "s" : ""}, una por página. Imprime y
              archiva.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/ficha">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </Link>
            <PrintButton label="Imprimir todas" />
          </div>
        </div>

        <div className="space-y-5 print:space-y-0">
          {all.map((c, i) => (
            <FichaPrintSheet
              key={c.id}
              convention={c}
              index={i + 1}
              total={all.length}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── ¿Todas o una en particular? ─────────────────────────────────────────
  const sinValidar = conventions.filter((c) => !c.validado).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ficha técnica de los MoUs</h1>
        <p className="mt-1 text-sm text-slate-500">
          ¿Necesitas todas las fichas o una en particular?
        </p>
      </div>

      <Link href="/ficha?ver=todas" className="block">
        <Card className="transition-all hover:border-slate-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Todas las fichas</p>
              <p className="text-sm text-slate-500">
                Las {conventions.length} fichas seguidas, una por página y listas para
                imprimir.
              </p>
            </div>
            <span className="text-2xl font-bold tabular-nums text-slate-300">
              {conventions.length}
            </span>
          </CardContent>
        </Card>
      </Link>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Una en particular</h2>
          {sinValidar > 0 && (
            <span className="text-xs text-amber-700">
              {sinValidar} sin validar
            </span>
          )}
        </div>
        <FichaPicker conventions={conventions} />
      </div>
    </div>
  );
}
