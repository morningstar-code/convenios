import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDashboardStats } from "@/repositories/convention.repository";
import { getRecentAlerts } from "@/repositories/alert.repository";
import type { AlertSeverity } from "@/types";

export const dynamic = "force-dynamic";

const alertSeverityVariant: Record<AlertSeverity, "destructive" | "warning" | "info"> = {
  critical: "destructive",
  warning: "warning",
  info: "info",
};

export default async function DashboardPage() {
  const [stats, recentAlerts] = await Promise.all([
    getDashboardStats(),
    getRecentAlerts(6),
  ]);

  const statCards = [
    {
      title: "Total Memorandos / Acuerdos",
      value: stats.total,
      icon: FileText,
      color: "text-slate-700",
      bg: "bg-slate-100",
      href: "/convenios",
    },
    {
      title: "Vigentes",
      value: stats.vigentes,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      href: "/convenios?estatus=vigente",
    },
    {
      title: "Sin Validar",
      value: stats.pendientesValidacion,
      icon: ShieldCheck,
      color: "text-amber-700",
      bg: "bg-amber-50",
      href: "/convenios",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Vista general del estado de memorandos y acuerdos de cooperación
          </p>
        </div>
        <Link href="/documentos/nuevo">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <Sparkles className="h-4 w-4" />
            Procesar documento con IA
          </button>
        </Link>
      </div>

      {/* AI Highlight banner */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 shrink-0">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Plataforma de procesamiento inteligente</p>
          <p className="text-sm text-slate-300 mt-0.5">
            Sube un PDF o DOCX y la IA extrae automáticamente todos los campos, calcula vencimientos y genera borradores.
          </p>
        </div>
        <Link href="/documentos/nuevo">
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-slate-900 text-sm font-medium hover:bg-slate-100 transition-colors shrink-0">
            <Upload className="h-4 w-4" />
            Subir memorando o acuerdo
          </span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {card.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">Alertas recientes</CardTitle>
            <Link href="/alertas">
              <Button variant="ghost" size="sm" className="text-slate-500 text-xs gap-1">
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentAlerts.length === 0 ? (
              <div className="px-6 pb-6 text-center text-sm text-slate-500 py-8">
                No hay alertas pendientes
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 px-6 py-3">
                    <div className="mt-0.5">
                      <Badge variant={alertSeverityVariant[alert.severidad as AlertSeverity]}>
                        {alert.severidad === "critical" ? "Crítico" : alert.severidad === "warning" ? "Atención" : "Info"}
                      </Badge>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 leading-tight">
                        {alert.titulo}
                      </p>
                      {alert.convention && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {alert.convention.contraparte} · {alert.convention.pais}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
