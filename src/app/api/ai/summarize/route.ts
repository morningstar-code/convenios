/**
 * POST /api/ai/summarize
 * Genera la ficha del convenio con IA (JSON estructurado).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { findConventionById } from "@/repositories/convention.repository";
import { generateConventionFicha, OpenAIExtractionError } from "@/lib/openai";
import { refineCriticalFields } from "@/lib/openai-document-extraction";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { addMonths } from "date-fns";
import { parseFichaDate } from "@/lib/ficha-date-parse";

export const runtime = "nodejs";

const RequestSchema = z.object({
  conventionId: z.string().min(1, "conventionId es requerido"),
});

async function loadDocumentBuffer(doc: {
  blobUrl: string;
  blobPathname: string;
}): Promise<Buffer> {
  if (doc.blobUrl.includes("/uploads/")) {
    const path = await import("path");
    const fs = await import("fs/promises");
    const filename = doc.blobPathname.replace(/^uploads\//, "");
    const filePath = path.join(process.cwd(), "public", "uploads", filename);
    return fs.readFile(filePath);
  }

  const res = await fetch(doc.blobUrl);
  if (!res.ok) {
    throw new Error(`No se pudo descargar el documento: HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { conventionId } = parsed.data;

    const [convention, latestDocWithText, latestDocAny, latestExtraction] = await Promise.all([
      findConventionById(conventionId),
      prisma.conventionDocument.findFirst({
        where: { conventionId, extractedText: { not: null } },
        orderBy: { createdAt: "desc" },
        select: {
          extractedText: true,
          originalName: true,
          mimeType: true,
          blobUrl: true,
          blobPathname: true,
        },
      }),
      prisma.conventionDocument.findFirst({
        where: { conventionId },
        orderBy: { createdAt: "desc" },
        select: {
          extractedText: true,
          originalName: true,
          mimeType: true,
          blobUrl: true,
          blobPathname: true,
        },
      }),
      prisma.conventionAIOutput.findFirst({
        where: { conventionId, tipo: "extraccion" },
        orderBy: { createdAt: "desc" },
        select: { resultado: true },
      }),
    ]);
    if (!convention) return NextResponse.json({ error: "Instrumento no encontrado" }, { status: 404 });

    const latestDoc = latestDocWithText ?? latestDocAny;
    const documentText = latestDoc?.extractedText ?? undefined;
    let documentBuffer: Buffer | undefined;
    if (latestDoc?.blobUrl && latestDoc?.blobPathname) {
      try {
        console.log(`[summarize] Loading document buffer from ${latestDoc.blobUrl}`);
        documentBuffer = await loadDocumentBuffer({
          blobUrl: latestDoc.blobUrl,
          blobPathname: latestDoc.blobPathname,
        });
        console.log(`[summarize] Buffer loaded: ${documentBuffer.length} bytes`);
      } catch (err) {
        console.warn("[summarize] No se pudo cargar el archivo completo:", err);
      }
    } else {
      console.warn("[summarize] No document found or missing blobUrl/blobPathname");
    }
    const criticalRefinement = latestDoc
      ? await refineCriticalFields({
          text: documentText,
          buffer: documentBuffer,
          mimeType: latestDoc?.mimeType ?? undefined,
          filename: latestDoc?.originalName || "documento.pdf",
        })
      : null;

    console.log(
      `[summarize] criticalRefinement: financial=${criticalRefinement?.responsabilidad_financiera.value ?? "null"}, ` +
      `evidence="${criticalRefinement?.responsabilidad_financiera.evidence?.text?.slice(0, 120) ?? "none"}", ` +
      `focalPoints=${criticalRefinement?.puntos_focales.length ?? 0}, ` +
      `model=${criticalRefinement?.model ?? "none"}`
    );

    const extractedResult =
      latestExtraction?.resultado &&
      typeof latestExtraction.resultado === "object" &&
      !Array.isArray(latestExtraction.resultado)
        ? (latestExtraction.resultado as {
            normalized?: { nombreConvenio?: string | null };
          })
        : null;

    const conventionData = {
      institucionPropia: "Instituto Dominicano de las Telecomunicaciones (INDOTEL)",
      nombreConvenio: extractedResult?.normalized?.nombreConvenio ?? null,
      documentoBase: latestDoc?.originalName ?? null,
      contraparte: convention.contraparte,
      pais: convention.pais,
      tipoInstrumento: convention.tipoInstrumento,
      fechaFirma: convention.fechaFirma,
      duracionTexto: convention.duracionTexto,
      duracionMeses: convention.duracionMeses,
      fechaVencimientoCalculada: convention.fechaVencimientoCalculada,
      objetivo: convention.objetivo,
      areasCooperacion: convention.areasCooperacion,
      modalidadesCooperacion: convention.modalidadesCooperacion,
      impactoEsperado: convention.impactoEsperado,
      responsabilidadFinanciera:
        criticalRefinement?.responsabilidad_financiera.value ?? convention.responsabilidadFinanciera,
      puntoFocal:
        criticalRefinement?.puntos_focales[0]?.value ?? convention.puntoFocal,
      cargoPuntoFocal: convention.cargoPuntoFocal,
      correoPuntoFocal: convention.correoPuntoFocal,
      condicionTerminacion: convention.condicionTerminacion,
      vigenciaTipo: convention.vigenciaTipo,
      diasPreaviso: convention.diasPreaviso,
      estatus: convention.estatus,
      direccionesInvolucradas: convention.direccionesInvolucradas,
      observaciones: convention.observaciones,
      montoReferencial: convention.montoReferencial,
      responsabilidadFinancieraEvidencia:
        criticalRefinement?.responsabilidad_financiera.evidence?.text ?? null,
    };

    const model = process.env.OPENAI_MODEL_SUMMARY || "gpt-4.1";

    const bufferArg = documentBuffer && latestDoc
      ? { buffer: documentBuffer, filename: latestDoc.originalName ?? "documento.pdf", mimeType: latestDoc.mimeType ?? "application/pdf" }
      : undefined;

    console.log(
      `[summarize] generating ficha — docText: ${documentText ? `${documentText.length} chars` : "none"}, ` +
      `buffer: ${bufferArg ? `${bufferArg.buffer.length} bytes` : "none"}, ` +
      `criticalFinancial: ${criticalRefinement?.responsabilidad_financiera.value ?? "null"}`
    );

    const ficha = await generateConventionFicha(
      conventionData as Record<string, unknown>,
      documentText,
      bufferArg
    );

    const draft = await prisma.conventionDraft.create({
      data: {
        conventionId,
        tipo: "ficha_tecnica",
        contenido: JSON.stringify(ficha),
        modelo: model,
        generadoPor: session.id,
      },
    });

    const fichaFechaFirma = parseFichaDate(ficha.fechaFirma);
    if (!convention.fechaFirma && fichaFechaFirma) {
      await prisma.convention.update({
        where: { id: conventionId },
        data: {
          fechaFirma: fichaFechaFirma,
          fechaVencimientoCalculada: convention.duracionMeses
            ? addMonths(fichaFechaFirma, convention.duracionMeses)
            : convention.fechaVencimientoCalculada,
        },
      });
    }

    await prisma.conventionAuditLog.create({
      data: {
        conventionId,
        userId: session.id,
        accion: "generar_ficha",
        descripcion: `Resumen ejecutivo generado por IA (modelo: ${model})`,
        esIA: true,
      },
    });

    return NextResponse.json({ ok: true, draft, ficha });
  } catch (err) {
    const isAIError = err instanceof OpenAIExtractionError;
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[summarize] Error:", message, err);
    return NextResponse.json(
      { error: isAIError ? message : "Error al generar la ficha" },
      { status: 500 }
    );
  }
}
