"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConventionPickItem } from "@/repositories/convention.repository";

/**
 * Cambia de instrumento sin volver al listado. Lo usan tanto la ficha técnica
 * como el seguimiento: ambas pantallas hablan siempre de un MoU concreto.
 *
 * El destino viaja como plantilla (":id") y no como función: las páginas que lo
 * usan son componentes de servidor, y una función no cruza esa frontera.
 */
export function ConventionSwitcher({
  conventions,
  currentId,
  hrefTemplate,
}: {
  conventions: ConventionPickItem[];
  currentId: string;
  /** Destino al elegir otro MoU, con ":id" donde va el identificador. */
  hrefTemplate: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (conventions.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500">MoU</span>
      <Select
        value={currentId}
        onValueChange={(id) => {
          if (id === currentId) return;
          setPending(true);
          router.push(hrefTemplate.replace(":id", encodeURIComponent(id)));
        }}
      >
        <SelectTrigger className="w-[280px]" aria-label="Cambiar de instrumento">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {conventions.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.contraparte.startsWith("[Pendiente]")
                ? "Instrumento en proceso"
                : c.contraparte}
              {" · "}
              {c.pais}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
    </div>
  );
}
