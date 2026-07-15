"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface FichaSection {
  id: string;
  label: string;
}

/**
 * Índice de la ficha. La ficha va toda de corrido (sin pestañas), así que el
 * índice es lo que evita que "todo en pantalla" se convierta en un scroll ciego:
 * marca la sección que estás leyendo y permite saltar a cualquier otra.
 */
export function FichaToc({ sections }: { sections: FichaSection[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      className="sticky top-24 hidden lg:flex flex-col no-print"
      aria-label="Índice de la ficha"
    >
      <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        En esta ficha
      </p>
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          aria-current={active === s.id ? "true" : undefined}
          className={cn(
            "border-l-2 px-2.5 py-1.5 text-xs transition-colors",
            active === s.id
              ? "border-blue-600 font-semibold text-slate-900"
              : "border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900"
          )}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
