"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Upload,
  FileText,
  ClipboardList,
  Radar,
  GitCompare,
  Route,
  Bell,
  Sparkles,
  ChevronRight,
  Building2,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SEGUIMIENTO_TABS, type SeguimientoTab } from "@/types";

interface NavItem {
  n: string;
  label: string;
  href: string;
  icon: React.ElementType;
  /** Highlighted as the primary action that starts the whole flow. */
  cta?: boolean;
  /** Extra path prefixes that should also light this item up. */
  match?: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    n: "1",
    label: "Carga / Ingreso",
    href: "/ingreso",
    icon: Upload,
    cta: true,
  },
  {
    n: "2",
    label: "Memorandos / Acuerdos",
    href: "/convenios",
    icon: FileText,
    // Only the list itself — a single instrument belongs to "Ficha técnica".
    match: (p) => p === "/convenios",
  },
  {
    n: "3",
    label: "Ficha técnica",
    href: "/ficha",
    icon: ClipboardList,
    // The ficha of one instrument lives under /convenios/<id>.
    match: (p) => p === "/ficha" || /^\/convenios\/[^/]+/.test(p),
  },
  {
    n: "4",
    label: "Seguimiento",
    href: "/seguimiento",
    icon: Radar,
  },
  {
    n: "5",
    label: "Comparación",
    href: "/comparacion",
    icon: GitCompare,
  },
];

const SUB_ITEMS: { tab: SeguimientoTab; label: string; icon: React.ElementType }[] = [
  { tab: "resumen", label: "Resumen ejecutivo IA", icon: Sparkles },
  { tab: "hoja-de-ruta", label: "Hoja de Ruta", icon: Route },
  { tab: "alertas", label: "Alertas", icon: Bell },
];

interface SidebarProps {
  userRole?: string;
  userName?: string;
  userEmail?: string;
  /** Pending alerts, shown as a badge on the Alertas sub-item. */
  alertCount?: number;
}

export function Sidebar({ userRole, userName, userEmail, alertCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isSeguimiento = pathname.startsWith("/seguimiento");
  const activeTab = (searchParams.get("tab") as SeguimientoTab | null) ?? SEGUIMIENTO_TABS[0];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white flex flex-col no-print">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 leading-tight truncate">
            {process.env.NEXT_PUBLIC_APP_NAME || "Memorandos / Acuerdos"}
          </p>
          <p className="text-xs text-slate-500">Sistema de Gestión</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-5 px-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Menú
        </p>

        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match
              ? item.match(pathname)
              : pathname === item.href || pathname.startsWith(item.href + "/");
            const isCta = item.cta && !isActive;

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-100 group",
                    isActive
                      ? "bg-slate-900 text-white"
                      : isCta
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <span
                    className={cn(
                      "w-3 shrink-0 text-[10px] font-semibold tabular-nums",
                      isActive || isCta ? "text-white/70" : "text-slate-400"
                    )}
                  >
                    {item.n}
                  </span>
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive || isCta
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-white/50" />}
                </Link>

                {/* Seguimiento sub-menu */}
                {item.href === "/seguimiento" && (
                  <div className="my-1 ml-[34px] flex flex-col gap-px border-l border-slate-200 pl-3">
                    {SUB_ITEMS.map((sub) => {
                      const isSubActive = isSeguimiento && activeTab === sub.tab;
                      return (
                        <Link
                          key={sub.tab}
                          href={`/seguimiento?tab=${sub.tab}`}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                            isSubActive
                              ? "font-semibold text-slate-900"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1 w-1 shrink-0 rounded-full",
                              isSubActive ? "bg-blue-600" : "bg-slate-300"
                            )}
                          />
                          <span className="flex-1 truncate">{sub.label}</span>
                          {sub.tab === "alertas" && alertCount > 0 && (
                            <span className="rounded-full border border-red-200 bg-red-50 px-1.5 text-[10px] font-semibold tabular-nums text-red-600">
                              {alertCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {userName?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{userName || "Usuario"}</p>
            <p className="truncate text-xs text-slate-500">
              {userRole === "admin" ? "Admin" : "Viewer"}
              {userEmail ? ` · ${userEmail}` : ""}
            </p>
          </div>
          <Link
            href="/configuracion"
            title="Configuración"
            aria-label="Configuración"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 transition-colors",
              pathname === "/configuracion"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-slate-500 hover:bg-red-50 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
