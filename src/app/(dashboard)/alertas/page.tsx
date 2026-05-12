import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findAlerts } from "@/repositories/alert.repository";
import { SeverityBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime } from "@/lib/utils";
import type { AlertSeverity, AlertType } from "@/types";
import { ALERT_TYPE_LABELS } from "@/types";
import { getSession } from "@/lib/auth";
import { RecalcularButton } from "@/features/alertas/components/recalcular-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    atendida?: string;
    severidad?: string;
    page?: string;
  }>;
}

export default async function AlertasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSession();

  const atendida = params.atendida === "true" ? true : params.atendida === "false" ? false : false;
  const { data: alerts, total } = await findAlerts({
    atendida,
    severidad: params.severidad as AlertSeverity | undefined,
    page: params.page ? parseInt(params.page) : 1,
    limit: 50,
  });

  const isAdmin = session?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alertas</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total} alerta{total !== 1 ? "s" : ""} {atendida ? "atendidas" : "pendientes"}
          </p>
        </div>
        {isAdmin && <RecalcularButton />}
      </div>

      <div className="flex gap-3">
        <Link href="/alertas?atendida=false">
          <Button variant={!atendida ? "default" : "outline"} size="sm">
            Pendientes
          </Button>
        </Link>
        <Link href="/alertas?atendida=true">
          <Button variant={atendida ? "default" : "outline"} size="sm">
            Atendidas
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="py-4 px-6 border-b border-slate-100">
          <CardTitle className="text-base text-slate-700">
            {atendida ? "Alertas atendidas" : "Alertas activas"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {alerts.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Sin alertas"
              description={atendida ? "No hay alertas atendidas." : "No hay alertas activas en este momento."}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <SeverityBadge severity={alert.severidad as AlertSeverity} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{alert.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{alert.descripcion}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-slate-400">
                          {ALERT_TYPE_LABELS[alert.tipo as AlertType]}
                        </span>
                        {alert.convention && (
                          <Link
                            href={`/convenios/${alert.convention.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {alert.convention.contraparte} · {alert.convention.pais}
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{formatDateTime(alert.createdAt)}</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {alert.atendida ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCheck className="h-3.5 w-3.5" />
                        Atendida
                      </span>
                    ) : (
                      isAdmin && <AtendidaButton alertId={alert.id} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { AtendidaButton } from "@/features/alertas/components/atendida-button";
