/**
 * POST /api/ai/extract — Re-extracción v2 sobre convenio existente.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { findDocumentById, updateDocumentExtraction } from "@/repositories/document.repository";
import { updateConvention } from "@/repositories/convention.repository";
import { runExtractionPipeline } from "@/services/document-extraction-pipeline";
import { ExtractRequestSchema } from "@/validators/ai";
import prisma from "@/lib/prisma";
import { stringArrayToJson } from "@/lib/json-array";
import { OpenAIExtractionError } from "@/lib/openai";
import type { InstrumentType } from "@prisma/client";

export const runtime = "nodejs";

async function loadBuffer(document: {
  blobUrl: string;
  blobPathname: string;
}): Promise<Buffer> {
  if (document.blobUrl.includes("/uploads/")) {
    const path = await import("path");
    const fs = await import("fs/promises");
    const filename = document.blobPathname.replace(/^uploads\//, "");
    return fs.readFile(path.join(process.cwd(), "public", "uploads", filename));
  }
  const res = await fetch(document.blobUrl);
  if (!res.ok) throw new Error(`No se pudo descargar el documento: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  let documentId: string | undefined;
  let conventionId: string | undefined;

  try {
    const body = await req.json();
    const parsed = ExtractRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    documentId = parsed.data.documentId;
    conventionId = parsed.data.conventionId;

    const document = await findDocumentById(documentId);
    if (!document) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

    const buffer = await loadBuffer(document);

    const { raw, normalized: n, pipeline, sourceTextUsed } = await runExtractionPipeline({
      buffer,
      mimeType: document.mimeType,
      originalName: document.originalName,
      cachedText: document.extractedText,
    });

    if (sourceTextUsed) {
      await updateDocumentExtraction(documentId, { extractedText: sourceTextUsed });
    }

    const resultadoV2 = { version: 2, raw, normalized: n, pipeline };

    await prisma.conventionAIOutput.create({
      data: {
        conventionId,
        documentId,
        userId: session.id,
        tipo: "extraccion",
        modelo: pipeline.model,
        resultado: resultadoV2 as unknown as import("@prisma/client").Prisma.InputJsonValue,
        confianza: n.confianza_extraccion,
        camposDudosos: stringArrayToJson(n.campos_dudosos),
      },
    });

    const updateData: Record<string, unknown> = {
      tipoInstrumento: n.tipoInstrumento as InstrumentType,
      contraparte: n.contraparte,
      pais: n.pais,
      fechaFirma: n.fechaFirma,
      duracionTexto: n.duracionTexto,
      duracionMeses: n.duracionMeses,
      fechaVencimientoCalculada: n.fechaVencimientoCalculada,
      renovacionAutomatica: n.renovacionAutomatica,
      condicionTerminacion: n.condicionTerminacion,
      diasPreaviso: n.diasPreaviso,
      puntoFocal: n.puntoFocal,
      cargoPuntoFocal: n.cargoPuntoFocal,
      correoPuntoFocal: n.correoPuntoFocal,
      direccionesInvolucradas: stringArrayToJson(n.direccionesInvolucradas),
      objetivo: n.objetivo,
      modalidadesCooperacion: stringArrayToJson(n.modalidadesCooperacion),
      areasCooperacion: stringArrayToJson(n.areasCooperacion),
      impactoEsperado: n.impactoEsperado,
      responsabilidadFinanciera: n.responsabilidadFinanciera,
      montoReferencial: n.montoReferencial,
      observaciones: n.observaciones,
    };

    await updateConvention(conventionId, updateData, session.id);

    await updateDocumentExtraction(documentId, { processedAt: new Date(), processingError: null });

    await prisma.conventionAuditLog.create({
      data: {
        conventionId,
        userId: session.id,
        accion: "extraccion_ia",
        descripcion: `Re-extracción v2 (${pipeline.path}, confianza ${Math.round(n.confianza_extraccion * 100)}%)`,
        cambios: updateData as unknown as import("@prisma/client").Prisma.InputJsonValue,
        esIA: true,
      },
    });

    return NextResponse.json({
      ok: true,
      version: 2,
      normalized: n,
      raw,
      pipeline,
      fieldsApplied: Object.keys(updateData).length,
      confianza: n.confianza_extraccion,
      camposDudosos: n.campos_dudosos,
      warnings: n.warnings,
    });
  } catch (err) {
    const message =
      err instanceof OpenAIExtractionError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Error desconocido";

    console.error("[extract] Error:", message, err);

    if (documentId) {
      await updateDocumentExtraction(documentId, { processingError: message }).catch(() => {});
    }

    return NextResponse.json(
      { error: err instanceof OpenAIExtractionError ? message : "Error en la extracción de datos" },
      { status: 500 }
    );
  }
}
