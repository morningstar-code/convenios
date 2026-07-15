/**
 * GET /api/ai/roadmap/export-word?conventionId=...
 * Descarga la Hoja de Ruta en .docx con el formato de la propuesta metodológica.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { findLatestRoadmap } from "@/repositories/roadmap.repository";
import { roadmapToDocx } from "@/lib/roadmap-word-export";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const conventionId = req.nextUrl.searchParams.get("conventionId");
  if (!conventionId) {
    return NextResponse.json({ error: "Falta el instrumento" }, { status: 400 });
  }

  try {
    const stored = await findLatestRoadmap(conventionId);
    if (!stored) {
      return NextResponse.json(
        { error: "Este instrumento todavía no tiene hoja de ruta" },
        { status: 404 }
      );
    }

    const buffer = await roadmapToDocx(stored.roadmap, {
      fechaGeneracion: stored.createdAt.toLocaleDateString("es-ES"),
    });

    const safeFilename = `Propuesta Hoja de Ruta - ${stored.roadmap.parte_contraparte}`
      .replace(/[^a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑ]/g, "")
      .trim()
      .slice(0, 80);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeFilename)}.docx"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("[roadmap-export] Error:", err);
    return NextResponse.json(
      { error: "Error al generar la hoja de ruta en Word" },
      { status: 500 }
    );
  }
}
