import Link from "next/link";
import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Los tres indicadores que vivían en el Dashboard. Allí eran enlaces al listado
 * filtrado, así que aquí son directamente los filtros del listado: mismo dato,
 * una pantalla menos y en el sitio donde se trabaja.
 */

export interface ConventionKpis {
  total: number;
  vigentes: number;
  pendientesValidacion: number;
}

interface KpiDef {
  key: string;
  label: string;
  value: number;
  href: string;
  icon: React.ElementType;
  tone: string;
  isActive: (p: URLSearchParams) => boolean;
}

export function ConventionKpiBar({
  stats,
  params,
}: {
  stats: ConventionKpis;
  params: Record<string, string | undefined>;
}) {
  const current = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => Boolean(e[1]))
  );

  const kpis: KpiDef[] = [
    {
      key: "total",
      label: "Total",
      value: stats.total,
      href: "/convenios",
      icon: FileText,
      tone: "bg-slate-100 text-slate-600 border-slate-200",
      isActive: (p) => !p.get("estatus") && !p.get("validado") && !p.get("porVencer"),
    },
    {
      key: "vigentes",
      label: "Vigentes",
      value: stats.vigentes,
      href: "/convenios?estatus=vigente",
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
      isActive: (p) => p.get("estatus") === "vigente" && !p.get("validado"),
    },
    {
      key: "sin-validar",
      label: "Sin validar",
      value: stats.pendientesValidacion,
      href: "/convenios?validado=false",
      icon: ShieldCheck,
      tone: "bg-amber-50 text-amber-700 border-amber-200",
      isActive: (p) => p.get("validado") === "false",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {kpis.map((kpi) => {
        const active = kpi.isActive(current);
        return (
          <Link
            key={kpi.key}
            href={kpi.href}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-all",
              active
                ? "border-slate-900 ring-1 ring-slate-900"
                : "border-slate-200 hover:border-slate-300 hover:shadow-md"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                kpi.tone
              )}
            >
              <kpi.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none tabular-nums text-slate-900">
                {kpi.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                {kpi.label}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
