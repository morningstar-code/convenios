import { Badge } from "@/components/ui/badge";
import type { ConventionStatus, AlertSeverity } from "@/types";

const statusConfig: Record<ConventionStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "info" | "default" | "critical" | "outline" }> = {
  vigente: { label: "Vigente", variant: "success" },
  cancelado: { label: "Cancelado", variant: "secondary" },
};

const severityConfig: Record<AlertSeverity, { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "info" | "default" | "critical" | "outline" }> = {
  info: { label: "Info", variant: "info" },
  warning: { label: "Atención", variant: "warning" },
  critical: { label: "Crítico", variant: "critical" },
};

export function StatusBadge({ status }: { status: ConventionStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const config = severityConfig[severity];
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
