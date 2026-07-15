"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ConventionPickItem } from "@/repositories/convention.repository";

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/**
 * "¿La ficha de cuál?" — se busca por organismo, que es como se recuerdan los
 * MoU ("el de ANATEL", "el de OSIPTEL"), con el país al lado como apoyo.
 */
export function FichaPicker({ conventions }: { conventions: ConventionPickItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return conventions;
    return conventions.filter(
      (c) => norm(c.contraparte).includes(q) || norm(c.pais).includes(q)
    );
  }, [conventions, query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por organismo o país…"
          className="pl-9"
          aria-label="Buscar instrumento"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Ningún instrumento coincide con «{query}».
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={`/convenios/${c.id}`}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {c.contraparte.startsWith("[Pendiente]")
                      ? "Instrumento en proceso"
                      : c.contraparte}
                  </p>
                  <p className="text-xs text-slate-500">{c.pais}</p>
                </div>
                {!c.validado && <Badge variant="warning">Sin validar</Badge>}
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-600" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
