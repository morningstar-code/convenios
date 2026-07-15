"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_COMPARE } from "@/lib/comparison";
import type { ConventionPickItem } from "@/repositories/convention.repository";

/**
 * Selección de instrumentos a comparar. La selección vive en la URL (?ids=)
 * para que la comparación se pueda compartir por enlace y la tabla se pinte
 * en el servidor.
 */
export function ComparisonPicker({
  conventions,
  selected,
}: {
  conventions: ConventionPickItem[];
  selected: string[];
}) {
  const router = useRouter();

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id].slice(-MAX_COMPARE);

    router.push(next.length ? `/comparacion?ids=${next.join(",")}` : "/comparacion");
  };

  return (
    <div className="flex flex-wrap gap-2">
      {conventions.map((c) => {
        const isOn = selected.includes(c.id);
        const isFull = !isOn && selected.length >= MAX_COMPARE;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            disabled={isFull}
            aria-pressed={isOn}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
              isOn
                ? "border-blue-600 bg-blue-50 font-semibold text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
              isFull && "cursor-not-allowed opacity-40"
            )}
            title={isFull ? `Máximo ${MAX_COMPARE} instrumentos` : undefined}
          >
            <span
              className={cn(
                "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                isOn ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
              )}
            >
              {isOn && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
            </span>
            <span className="max-w-[220px] truncate">
              {c.contraparte.startsWith("[Pendiente]")
                ? "Instrumento en proceso"
                : c.contraparte}
            </span>
            <span className={cn("shrink-0", isOn ? "text-blue-400" : "text-slate-400")}>
              {c.pais}
            </span>
          </button>
        );
      })}
    </div>
  );
}
