"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { SEGUIMIENTO_TAB_LABELS, parseSeguimientoTab } from "@/types";

const breadcrumbMap: Record<string, string> = {
  ingreso: "Carga / Ingreso",
  convenios: "Memorandos / Acuerdos",
  ficha: "Ficha técnica",
  seguimiento: "Seguimiento",
  comparacion: "Comparación",
  configuracion: "Configuración",
  nuevo: "Nuevo",
  editar: "Editar",
};

/** Los ids son cuids: no sirven como miga de pan. */
function isRecordId(segment: string): boolean {
  return /^c[a-z0-9]{15,}$/i.test(segment) || segment.length > 20;
}

export function Topbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const segments = pathname.split("/").filter(Boolean);

  const breadcrumbs = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const isLast = idx === segments.length - 1;

    // /convenios/<id> es la ficha técnica del instrumento.
    const label =
      isRecordId(seg) && segments[idx - 1] === "convenios"
        ? "Ficha técnica"
        : breadcrumbMap[seg] || seg;

    return { href, label, isLast };
  });

  // La pestaña activa de Seguimiento cuenta como un nivel más.
  if (segments[0] === "seguimiento") {
    const tab = parseSeguimientoTab(searchParams.get("tab"));
    breadcrumbs[0] = { ...breadcrumbs[0], isLast: false };
    breadcrumbs.push({
      href: `/seguimiento?tab=${tab}`,
      label: SEGUIMIENTO_TAB_LABELS[tab],
      isLast: true,
    });
  }

  return (
    <header className="fixed top-0 right-0 left-64 z-30 h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center px-6 no-print">
      <nav className="flex items-center gap-1 text-sm" aria-label="Ruta de navegación">
        <Link
          href="/convenios"
          className="text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Inicio"
        >
          <Home className="h-4 w-4" />
        </Link>
        {breadcrumbs.map(({ href, label, isLast }) => (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            {isLast ? (
              <span className="font-medium text-slate-900">{label}</span>
            ) : (
              <Link href={href} className="text-slate-500 hover:text-slate-700 transition-colors">
                {label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </header>
  );
}
