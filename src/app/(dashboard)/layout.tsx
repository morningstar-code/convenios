import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { countPendingAlerts } from "@/repositories/alert.repository";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Si la base no responde, el menú se dibuja igual: el contador es accesorio.
  const alertCount = await countPendingAlerts().catch(() => 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar lee ?tab= para marcar el subítem activo de Seguimiento. */}
      <Suspense fallback={null}>
        <Sidebar
          userRole={session.role}
          userName={session.name}
          userEmail={session.email}
          alertCount={alertCount}
        />
      </Suspense>
      <div className="pl-64 print-canvas">
        <Suspense fallback={null}>
          <Topbar />
        </Suspense>
        <main className="pt-16 min-h-screen">
          <div className="p-6 lg:p-8 print-sheet">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
