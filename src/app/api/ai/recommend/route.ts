/**
 * POST /api/ai/recommend
 * Generates a preliminary recommendation draft for a convention.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { findConventionById } from "@/repositories/convention.repository";
import { generateConventionRecommendation, OpenAIExtractionError } from "@/lib/openai";
import { RecommendRequestSchema } from "@/validators/ai";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = RecommendRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { conventionId } = parsed.data;

    const convention = await findConventionById(conventionId);
    if (!convention) return NextResponse.json({ error: "Instrumento no encontrado" }, { status: 404 });

    const conventionData = {
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
      responsabilidadFinanciera: convention.responsabilidadFinanciera,
      puntoFocal: convention.puntoFocal,
      condicionTerminacion: convention.condicionTerminacion,
      diasPreaviso: convention.diasPreaviso,
      estatus: convention.estatus,
      observaciones: convention.observaciones,
    };

    const model = process.env.OPENAI_MODEL_RECOMMEND || "gpt-4.1";

    const content = await generateConventionRecommendation(
      conventionData as Record<string, unknown>
    );

    const draft = await prisma.conventionDraft.create({
      data: {
        conventionId,
        tipo: "recomendacion_preliminar",
        contenido: content,
        modelo: model,
        generadoPor: session.id,
      },
    });

    await prisma.conventionAuditLog.create({
      data: {
        conventionId,
        userId: session.id,
        accion: "generar_borrador",
        descripcion: `Recomendación preliminar generada por IA (modelo: ${model})`,
        esIA: true,
      },
    });

    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    const isAIError = err instanceof OpenAIExtractionError;
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[recommend] Error:", message, err);
    return NextResponse.json(
      { error: isAIError ? message : "Error al generar la recomendación" },
      { status: 500 }
    );
  }
}
