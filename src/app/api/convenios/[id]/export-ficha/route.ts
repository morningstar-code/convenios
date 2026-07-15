/**
 * GET /api/convenios/[id]/export-ficha
 * Exporta la ficha técnica (los campos validados del instrumento) como .docx.
 * No llama a la IA: solo formatea lo que ya está en la base.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { findConventionById } from "@/repositories/convention.repository";
import { conventionToFicha } from "@/lib/convention-to-ficha";
import { fichaToDocx } from "@/lib/word-export";
import { getDocumentPublicUrl } from "@/lib/document-url";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  try {
    const convention = await findConventionById(id);
    if (!convention) {
      return NextResponse.json({ error: "Instrumento no encontrado" }, { status: 404 });
    }

    const latestDocument = [...convention.documents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    const ficha = conventionToFicha(
      {
        ...convention,
        montoReferencial: convention.montoReferencial?.toString() ?? null,
      },
      {
        nombreDocumento: latestDocument?.originalName,
        enlace: latestDocument ? getDocumentPublicUrl(latestDocument) : null,
      }
    );

    const buffer = await fichaToDocx(ficha, {
      fechaGeneracion: new Date().toLocaleDateString("es-ES"),
      editadoManualmente: convention.validado,
    });

    const safeFilename = `Ficha técnica - ${convention.contraparte}`
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
    console.error("[export-ficha] Error:", err);
    return NextResponse.json(
      { error: "Error al generar la ficha en Word" },
      { status: 500 }
    );
  }
}
