import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { SeverityBadge } from "@/components/shared/status-badge";
import { findAlerts } from "@/repositories/alert.repository";
import { formatDateTime } from "@/lib/utils";
import { ALERT_TYPE_LABELS } from "@/types";
import type { AlertSeverity, AlertType } from "@/types";
import { RecalcularButton } from "@/features/alertas/components/recalcular-button";
import { AtendidaButton } from "@/features/alertas/components/atendida-button";
import { cn } from "@/lib/utils";

const SEVERITY_BORDER: Record<AlertSeverity, string> = {
  critical: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

/**
 * Alertas de toda la cartera. A diferencia del resumen y la hoja de ruta, esta
 * sección no depende del MoU seleccionado: su gracia es ver de un vistazo todo
 * lo que vence o quedó sin validar.
 */
export async function AlertsPanel({
  atendida,
  isAdmin,
}: {
  atendida: boolean;
  isAdmin: boolean;
}) {
  const [{ data: alerts, total }, pending] = await Promise.all([
    findAlerts({ atendida, limit: 50 }),
    findAlerts({ atendida: false, limit: 1 }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/seguimiento?tab=alertas">
          <Button variant={!atendida ? "default" : "outline"} size="sm">
            Sin atender ({pending.total})
          </Button>
        </Link>
        <Link href="/seguimiento?tab=alertas&atendida=true">
          <Button variant={atendida ? "default" : "outline"} size="sm">
            Atendidas
          </Button>
        </Link>
        <div className="ml-auto">{isAdmin && <RecalcularButton />}</div>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Bell}
              title={atendida ? "Sin alertas atendidas" : "Nada pendiente"}
              description={
                atendida
                  ? "Aquí aparecerán las alertas que vayas marcando como atendidas."
                  : "No hay vencimientos próximos ni instrumentos sin validar."
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-l-[3px] border-slate-200 bg-white px-4 py-3",
                SEVERITY_BORDER[alert.severidad as AlertSeverity]
              )}
            >
              <div className="mt-0.5 shrink-0">
                <SeverityBadge severity={alert.severidad as AlertSeverity} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{alert.titulo}</p>
                <p className="mt-0.5 text-xs text-slate-600">{alert.descripcion}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {ALERT_TYPE_LABELS[alert.tipo as AlertType]}
                  </span>
                  {alert.convention && (
                    <Link
                      href={`/convenios/${alert.convention.id}`}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      {alert.convention.contraparte} · {alert.convention.pais}
                    </Link>
                  )}
                  <span className="text-xs text-slate-400">
                    {formatDateTime(alert.createdAt)}
                  </span>
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

          {total > alerts.length && (
            <p className="px-1 pt-1 text-xs text-slate-400">
              Mostrando {alerts.length} de {total} alertas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
