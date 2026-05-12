"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const breadcrumbMap: Record<string, string> = {
  dashboard: "Dashboard",
  convenios: "Memorandos / Acuerdos",
  nuevo: "Nuevo",
  editar: "Editar",
  alertas: "Alertas",
  documentos: "Documentos",
  configuracion: "Configuración",
};

export function Topbar() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  const breadcrumbs = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const label = breadcrumbMap[seg] || (seg.length > 20 ? seg.slice(0, 8) + "..." : seg);
    const isLast = idx === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <header className="fixed top-0 right-0 left-64 z-30 h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center px-6">
      <nav className="flex items-center gap-1 text-sm">
        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
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
