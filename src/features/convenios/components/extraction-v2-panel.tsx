"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, FileSearch, AlertTriangle } from "lucide-react";
type Evidence = { page: number | null; text: string | null };
type SField = { value: string | null; confidence: number; evidence: Evidence | null };

function FieldRow({
  label,
  field,
}: {
  label: string;
  field: SField | undefined | null;
}) {
  const [open, setOpen] = useState(false);
  if (!field) return null;
  const v = field.value?.trim() || "—";
  const pct = Math.round(field.confidence * 100);
  return (
    <div className="border-b border-slate-100 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">
            {label}
          </span>
          <p className="text-slate-900 mt-0.5 break-words">{v}</p>
        </div>
        <Badge
          variant={pct >= 80 ? "success" : pct >= 50 ? "warning" : "destructive"}
          className="shrink-0 text-[10px]"
        >
          {pct}%
        </Badge>
      </div>
      {field.evidence?.text && (
        <div className="mt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-slate-500 px-0"
            onClick={() => setOpen(!open)}
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Evidencia {field.evidence.page != null ? `(pág. ${field.evidence.page})` : ""}
          </Button>
          {open && (
            <blockquote className="mt-1 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-md p-2 italic">
              {field.evidence.text}
            </blockquote>
          )}
        </div>
      )}
    </div>
  );
}

export function ExtractionV2Panel({ resultado }: { resultado: Record<string, unknown> }) {
  const raw = resultado.raw as Record<string, unknown> | undefined;
  const normalized = resultado.normalized as Record<string, unknown> | undefined;
  const pipeline = resultado.pipeline as Record<string, unknown> | undefined;

  if (!raw || !normalized) {
    return (
      <p className="text-sm text-slate-500">
        Formato de extracción no reconocido (esperado v2 con raw + normalized).
      </p>
    );
  }

  const campos = (normalized.campos_dudosos as string[]) || [];
  const warnings = (normalized.warnings as string[]) || [];
  const firmantes = (normalized.firmantes as string[]) || [];
  const focos = (normalized.puntosFocales as string[]) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="info" className="gap-1">
          <FileSearch className="h-3 w-3" />
          Extraído por IA (v2)
        </Badge>
        <Badge variant="warning">Pendiente de validación humana</Badge>
        {pipeline && (
          <span className="text-xs text-slate-500">
            vía {(pipeline.path as string) || "?"} · modelo {String(pipeline.model)} ·{" "}
            {String(pipeline.openaiLatencyMs)} ms
          </span>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Campos con evidencia</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <FieldRow label="Nombre del instrumento" field={raw.nombre_convenio as SField} />
          <FieldRow label="Tipo (documento)" field={raw.tipo_instrumento as SField} />
          <FieldRow label="Parte principal" field={raw.parte_principal as SField} />
          <FieldRow label="Fecha de firma (texto)" field={raw.fecha_firma as SField} />
          <FieldRow label="Objeto" field={raw.objetivo as SField} />
          <FieldRow label="Vigencia (tipo)" field={raw.vigencia_tipo as SField} />
          <FieldRow label="Condición de terminación" field={raw.condicion_terminacion as SField} />
        </CardContent>
      </Card>

      {(firmantes.length > 0 || focos.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-xs font-semibold text-slate-700">Firmantes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-slate-700">
              {firmantes.length ? (
                <ul className="list-disc pl-4 space-y-1">
                  {firmantes.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-xs font-semibold text-slate-700">
                Puntos focales / contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-slate-700">
              {focos.length ? (
                <ul className="list-disc pl-4 space-y-1">
                  {focos.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {campos.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Campos dudosos
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {campos.map((c) => (
              <Badge key={c} variant="warning" className="text-xs">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
          <p className="font-semibold text-slate-800">Advertencias</p>
          {warnings.map((w, i) => (
            <p key={i}>• {w}</p>
          ))}
        </div>
      )}

      {Array.isArray(pipeline?.postProcessorRulesApplied) &&
        (pipeline!.postProcessorRulesApplied as string[]).length > 0 && (
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer font-medium text-slate-600">
              Reglas del post-procesador
            </summary>
            <ul className="mt-1 list-disc pl-4">
              {(pipeline!.postProcessorRulesApplied as string[]).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </details>
        )}
    </div>
  );
}
