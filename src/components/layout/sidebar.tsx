"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Bell,
  FolderOpen,
  Settings,
  ChevronRight,
  Building2,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Procesar con IA",
    href: "/documentos/nuevo",
    icon: Sparkles,
    highlight: true,
  },
  {
    label: "Memorandos / Acuerdos",
    href: "/convenios",
    icon: FileText,
  },
  {
    label: "Alertas",
    href: "/alertas",
    icon: Bell,
  },
  {
    label: "Documentos",
    href: "/documentos",
    icon: FolderOpen,
  },
  {
    label: "Configuración",
    href: "/configuracion",
    icon: Settings,
  },
];

interface SidebarProps {
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

export function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white flex flex-col">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 leading-tight">
            {process.env.NEXT_PUBLIC_APP_NAME || "Memorandos / Acuerdos"}
          </p>
          <p className="text-xs text-slate-500">Sistema de Gestión</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                item.href !== "/documentos/nuevo" &&
                pathname.startsWith(item.href));
            const isHighlight = item.highlight && !isActive;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-100 group",
                  isActive
                    ? "bg-slate-900 text-white"
                    : isHighlight
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive || isHighlight
                      ? "text-white"
                      : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            {userName?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{userName || "Usuario"}</p>
            <p className="text-xs text-slate-500 truncate">{userEmail || ""}</p>
          </div>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded font-medium",
            userRole === "admin"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600"
          )}>
            {userRole === "admin" ? "Admin" : "Viewer"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
