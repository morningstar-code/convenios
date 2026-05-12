/**
 * GET /api/ai/drafts/[draftId]/export-word
 * Generates and downloads the ficha as a .docx Word document.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fichaToDocx } from "@/lib/word-export";
import type { FichaConvenio } from "@/lib/openai";
import { sanitizeFichaConvenio } from "@/lib/ficha-utils";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { draftId } = await params;

  try {
    const draft = await prisma.conventionDraft.findUnique({
      where: { id: draftId },
      include: { convention: { select: { contraparte: true } } },
    });

    if (!draft) return NextResponse.json({ error: "Borrador no encontrado" }, { status: 404 });

    let ficha: FichaConvenio;
    try {
      ficha = sanitizeFichaConvenio(JSON.parse(draft.contenido) as FichaConvenio);
    } catch {
      return NextResponse.json({ error: "El contenido de la ficha no es válido" }, { status: 400 });
    }

    const buffer = await fichaToDocx(ficha, {
      editadoManualmente: draft.editadoManualmente,
      fechaGeneracion: draft.editadoManualmente
        ? (draft.editadoEn?.toLocaleDateString("es-ES") ?? undefined)
        : draft.createdAt.toLocaleDateString("es-ES"),
    });

    const safeFilename = (ficha.nombreDocumento || draft.convention?.contraparte || "ficha")
      .replace(/[^a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑ]/g, "")
      .trim()
      .slice(0, 80);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeFilename)}.docx"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("[export-word] Error:", err);
    return NextResponse.json({ error: "Error al generar el documento Word" }, { status: 500 });
  }
}
