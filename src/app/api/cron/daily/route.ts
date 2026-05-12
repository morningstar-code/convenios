import { NextRequest, NextResponse } from "next/server";
import { recalculateAllAlerts } from "@/services/convention.service";

export const runtime = "nodejs";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Verify cron secret for security
  const authHeader = req.headers.get("authorization");

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    console.log("[CRON] Starting daily alert recalculation...");
    const result = await recalculateAllAlerts();
    console.log(`[CRON] Done. Processed ${result.processed} conventions.`);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    console.error("[CRON] Error:", err);
    return NextResponse.json({ error: "Error en el cron job" }, { status: 500 });
  }
}
