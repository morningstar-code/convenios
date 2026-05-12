import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { recalculateAllAlerts } from "@/services/convention.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  try {
    const result = await recalculateAllAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Recalculate alerts error:", err);
    return NextResponse.json({ error: "Error al recalcular alertas" }, { status: 500 });
  }
}
