"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConventionFiltersBarProps {
  currentParams: Record<string, string | undefined>;
}

const currentCalendarYear = new Date().getFullYear();
const FIRMA_YEAR_START = 1990;
const FIRMA_YEAR_END = Math.max(currentCalendarYear + 1, FIRMA_YEAR_START);
const YEARS_DESC = Array.from({ length: FIRMA_YEAR_END - FIRMA_YEAR_START + 1 }, (_, i) => FIRMA_YEAR_END - i);

export function ConventionFiltersBar({ currentParams }: ConventionFiltersBarProps) {
  const router = useRouter();

  const updateParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams();
      Object.entries(currentParams).forEach(([k, v]) => {
        if (v && k !== key && k !== "page") params.set(k, v);
      });
      if (value && value !== "all") params.set(key, value);
      router.push(`/convenios?${params.toString()}`);
    },
    [currentParams, router]
  );

  const hasFilters = Object.values(currentParams).some((v) => v);

  const clearFilters = () => router.push("/convenios");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar memorandos o acuerdos..."
          className="pl-9"
          defaultValue={currentParams.search || ""}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length === 0 || value.length >= 2) {
              updateParam("search", value || undefined);
            }
          }}
        />
      </div>

      <Select
        value={currentParams.estatus || "all"}
        onValueChange={(v) => updateParam("estatus", v === "all" ? undefined : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Estatus" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estatus</SelectItem>
          <SelectItem value="vigente">Vigente</SelectItem>
          <SelectItem value="cancelado">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={currentParams.tipoInstrumento || "all"}
        onValueChange={(v) => updateParam("tipoInstrumento", v === "all" ? undefined : v)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          <SelectItem value="convenio_marco">Acuerdo Marco</SelectItem>
          <SelectItem value="convenio_especifico">Acuerdo Específico</SelectItem>
          <SelectItem value="memorando_entendimiento">Memorando de Entendimiento</SelectItem>
          <SelectItem value="acuerdo_cooperacion">Acuerdo de Cooperación</SelectItem>
          <SelectItem value="protocolo">Protocolo</SelectItem>
          <SelectItem value="declaracion_conjunta">Declaración Conjunta</SelectItem>
          <SelectItem value="otro">Otro</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={currentParams.anio || "all"}
        onValueChange={(v) => updateParam("anio", v === "all" ? undefined : v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Año de firma" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          <SelectItem value="all">Todos los años</SelectItem>
          {YEARS_DESC.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentParams.porVencer || "all"}
        onValueChange={(v) => updateParam("porVencer", v === "all" ? undefined : v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Vencimiento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="30">Vence en 30 días</SelectItem>
          <SelectItem value="60">Vence en 60 días</SelectItem>
          <SelectItem value="90">Vence en 90 días</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
          <X className="h-4 w-4 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
