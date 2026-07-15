"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface Analysis {
  solapamientos: string[];
  diferencias: string[];
  vacios: string[];
}

const GROUPS: { key: keyof Analysis; label: string; tone: string }[] = [
  { key: "solapamientos", label: "Se solapan", tone: "text-blue-700" },
  { key: "diferencias", label: "Se diferencian", tone: "text-slate-700" },
  { key: "vacios", label: "Vacíos detectados", tone: "text-amber-700" },
];

/** Lectura de apoyo sobre la tabla: no se guarda, se pide cuando hace falta. */
export function ComparisonAIPanel({ ids }: { ids: string[] }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al analizar");
      setAnalysis(data.analysis);
    } catch (err) {
      toast({
        title: "Error al analizar",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isEmpty =
    analysis &&
    GROUPS.every((g) => analysis[g.key].length === 0);

  return (
    <div className="space-y-3">
      <Button
        onClick={run}
        disabled={loading || ids.length < 2}
        className="bg-blue-600 text-white hover:bg-blue-700"
        size="sm"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Analizando…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {analysis ? "Analizar de nuevo" : "Analizar con IA"}
          </>
        )}
      </Button>

      {analysis && (
        <Card className="border-blue-200 bg-gradient-to-b from-blue-50/70 to-transparent">
          <CardContent className="space-y-4 p-5">
            {isEmpty ? (
              <p className="text-sm text-slate-600">
                La IA no encontró solapamientos, diferencias ni vacíos que destacar entre
                estos instrumentos.
              </p>
            ) : (
              GROUPS.map((group) =>
                analysis[group.key].length === 0 ? null : (
                  <div key={group.key}>
                    <p className={`text-xs font-semibold ${group.tone}`}>{group.label}</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {analysis[group.key].map((item, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm leading-relaxed text-slate-700"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )
            )}
            <p className="border-t border-blue-100 pt-3 text-xs text-slate-400">
              Lectura generada por IA a partir de los campos registrados. No sustituye la
              revisión del instrumento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
