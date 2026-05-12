/**
 * POST /api/ai/process-document
 *
 * Pipeline v2: buffer → texto local o file input → OpenAI (evidencia) → Zod → post-processor
 * → actualiza el convenio vinculado al documento → ficha técnica (plantilla).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { findDocumentById, updateDocumentExtraction } from "@/repositories/document.repository";
import { runExtractionPipeline } from "@/services/document-extraction-pipeline";
import { generateConventionFicha } from "@/lib/openai";
import prisma from "@/lib/prisma";
import { stringArrayToJson } from "@/lib/json-array";
import type { InstrumentType } from "@prisma/client";
import { OpenAIExtractionError } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  let documentId: string | undefined;

  try {
    const body = await req.json();
    documentId = body.documentId as string;

    if (!documentId) {
      return NextResponse.json({ error: "documentId es requerido" }, { status: 400 });
    }

    const document = await findDocumentById(documentId);
    if (!document) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    const preservedEstatus = document.convention?.estatus ?? "vigente";

    await updateDocumentExtraction(documentId, { processingError: null });

    console.log(`[process-document] Loading bytes ${document.blobUrl}`);

    let buffer: Buffer;
    if (document.blobUrl.includes("/uploads/")) {
      const path = await import("path");
      const fs = await import("fs/promises");
      const filename = document.blobPathname.replace(/^uploads\//, "");
      const filePath = path.join(process.cwd(), "public", "uploads", filename);
      buffer = await fs.readFile(filePath);
    } else {
      const blobResponse = await fetch(document.blobUrl);
      if (!blobResponse.ok) {
        throw new Error(`No se pudo descargar el documento: HTTP ${blobResponse.status}`);
      }
      buffer = Buffer.from(await blobResponse.arrayBuffer());
    }

    const pipelineResult = await runExtractionPipeline({
      buffer,
      mimeType: document.mimeType,
      originalName: document.originalName,
      cachedText: document.extractedText,
    });

    const { raw, normalized: n, pipeline, usedPath, sourceTextUsed } = pipelineResult;

    if (sourceTextUsed) {
      await updateDocumentExtraction(documentId, { extractedText: sourceTextUsed });
    }

    console.log(
      `[process-document] OpenAI model=${pipeline.model} path=${usedPath} latency=${pipeline.openaiLatencyMs}ms rules=${pipeline.postProcessorRulesApplied.join("; ")}`
    );

    const resultadoV2 = {
      version: 2,
      raw,
      normalized: n,
      pipeline,
    } as const;

    const conventionId = document.conventionId;

    const convention = await prisma.convention.update({
      where: { id: conventionId },
      data: {
        tipoInstrumento: n.tipoInstrumento as InstrumentType,
        contraparte: n.contraparte,
        pais: n.pais,
        fechaFirma: n.fechaFirma,
        duracionTexto: n.duracionTexto,
        duracionMeses: n.duracionMeses,
        fechaVencimientoCalculada: n.fechaVencimientoCalculada,
        renovacionAutomatica: n.renovacionAutomatica,
        estatus: preservedEstatus,
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
        validado: false,
      },
    });

    await prisma.conventionDocument.update({
      where: { id: documentId },
      data: {
        processedAt: new Date(),
        processingError: null,
      },
    });

    await prisma.conventionAIOutput.create({
      data: {
        conventionId: convention.id,
        documentId,
        userId: session.id,
        tipo: "extraccion",
        modelo: pipeline.model,
        resultado: resultadoV2 as unknown as import("@prisma/client").Prisma.InputJsonValue,
        confianza: n.confianza_extraccion,
        camposDudosos: stringArrayToJson(n.campos_dudosos),
      },
    });

    await prisma.conventionAuditLog.create({
      data: {
        conventionId: convention.id,
        userId: session.id,
        accion: "extraccion_ia",
        descripcion: `Instrumento actualizado por extracción documental v2 (${usedPath}, confianza ${Math.round(n.confianza_extraccion * 100)}%)`,
        esIA: true,
      },
    });

    const summaryModel = process.env.OPENAI_MODEL_SUMMARY || "gpt-4.1";

    const fichaPayload = {
      institucionPropia: "Instituto Dominicano de las Telecomunicaciones (INDOTEL)",
      nombreConvenio: n.nombreConvenio,
      documentoBase: document.originalName,
      contraparte: n.contraparte,
      pais: n.pais,
      tipoInstrumento: n.tipoInstrumento,
      fechaFirma: n.fechaFirma,
      duracionTexto: n.duracionTexto,
      duracionMeses: n.duracionMeses,
      fechaVencimientoCalculada: n.fechaVencimientoCalculada,
      objetivo: n.objetivo,
      areasCooperacion: n.areasCooperacion,
      modalidadesCooperacion: n.modalidadesCooperacion,
      impactoEsperado: n.impactoEsperado,
      responsabilidadFinanciera: n.responsabilidadFinanciera,
      montoReferencial: n.montoReferencial,
      puntoFocal: n.puntoFocal,
      cargoPuntoFocal: n.cargoPuntoFocal,
      correoPuntoFocal: n.correoPuntoFocal,
      condicionTerminacion: n.condicionTerminacion,
      vigenciaTipo: n.vigenciaTipo,
      diasPreaviso: n.diasPreaviso,
      estatus: preservedEstatus === "cancelado" ? "Cancelado" : "Vigente",
      direccionesInvolucradas: n.direccionesInvolucradas,
      observaciones: n.observaciones,
    };

    const bufferArg = buffer && buffer.length > 0
      ? { buffer, filename: document.originalName, mimeType: document.mimeType }
      : undefined;

    const ficha = await generateConventionFicha(
      fichaPayload as Record<string, unknown>,
      sourceTextUsed ?? undefined,
      bufferArg
    );

    await prisma.conventionDraft.create({
      data: {
        conventionId: convention.id,
        tipo: "ficha_tecnica",
        contenido: JSON.stringify(ficha),
        modelo: summaryModel,
        documentoBase: document.originalName,
        generadoPor: session.id,
      },
    });

    await prisma.conventionAuditLog.create({
      data: {
        conventionId: convention.id,
        userId: session.id,
        accion: "generar_ficha",
        descripcion: `Resumen ejecutivo generado por IA (modelo: ${summaryModel})`,
        esIA: true,
      },
    });

    console.log(`[process-document] Done convention=${convention.id}`);

    return NextResponse.json({
      ok: true,
      conventionId: convention.id,
      documentId,
      extraction: {
        version: 2,
        confianza: n.confianza_extraccion,
        campos_dudosos: n.campos_dudosos,
        warnings: n.warnings,
        pipeline,
        normalized_preview: {
          nombre_convenio: n.nombreConvenio,
          contraparte: n.contraparte,
          pais: n.pais,
          tipo_instrumento: n.tipoInstrumento,
          firmantes: n.firmantes,
          puntos_focales: n.puntosFocales,
        },
      },
      alertas_generadas: [] as string[],
      borradores_generados: ["ficha_tecnica"],
    });
  } catch (err) {
    console.error("[process-document] Error:", err);

    const message =
      err instanceof OpenAIExtractionError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Error desconocido";

    if (documentId) {
      await updateDocumentExtraction(documentId, {
        processingError: message,
        processedAt: undefined,
      }).catch(() => {});
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
