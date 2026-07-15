/**
 * POST /api/ai/roadmap
 * Genera la Hoja de Ruta de un MoU a partir de su resumen ejecutivo.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { findConventionById } from "@/repositories/convention.repository";
import { saveRoadmap } from "@/repositories/roadmap.repository";
import { generateConventionRoadmap } from "@/lib/openai-roadmap";
import { OpenAIExtractionError, type FichaConvenio } from "@/lib/openai";
import { sanitizeFichaConvenio } from "@/lib/ficha-utils";
import { fichaToPlainText } from "@/lib/ficha-plain-text";
import { INSTRUMENT_TYPE_LABELS } from "@/types";
import type { InstrumentType } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const RequestSchema = z.object({
  conventionId: z.string().min(1, "conventionId es requerido"),
  instrucciones: z.string().max(1_000).optional(),
});

/** El resumen ejecutivo se guarda como JSON de ficha; lo pasamos a texto. */
function readResumenEjecutivo(contenido: string | undefined): string | null {
  if (!contenido) return null;
  try {
    const parsed = JSON.parse(contenido);
    if (parsed && typeof parsed.nombreDocumento === "string") {
      return fichaToPlainText(sanitizeFichaConvenio(parsed as FichaConvenio));
    }
  } catch {
    // Un borrador editado a mano puede ser texto plano: sirve igual.
    return contenido;
  }
  return contenido;
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { conventionId, instrucciones } = parsed.data;

    const convention = await findConventionById(conventionId);
    if (!convention) {
      return NextResponse.json({ error: "Instrumento no encontrado" }, { status: 404 });
    }

    const resumenDraft = convention.drafts.find(
      (d) => d.tipo === "ficha_tecnica" || d.tipo === "resumen_ejecutivo"
    );

    if (!resumenDraft) {
      return NextResponse.json(
        {
          error:
            "Genera primero el resumen ejecutivo: la hoja de ruta se construye a partir de él.",
        },
        { status: 409 }
      );
    }

    const conventionData = {
      institucionPropia: "Instituto Dominicano de las Telecomunicaciones (INDOTEL)",
      paisPropio: "República Dominicana",
      contraparte: convention.contraparte,
      pais: convention.pais,
      tipoInstrumento:
        INSTRUMENT_TYPE_LABELS[convention.tipoInstrumento as InstrumentType] ??
        convention.tipoInstrumento,
      fechaFirma: convention.fechaFirma,
      fechaVencimientoCalculada: convention.fechaVencimientoCalculada,
      duracionTexto: convention.duracionTexto,
      duracionMeses: convention.duracionMeses,
      objetivo: convention.objetivo,
      areasCooperacion: convention.areasCooperacion,
      modalidadesCooperacion: convention.modalidadesCooperacion,
      direccionesInvolucradas: convention.direccionesInvolucradas,
      puntoFocal: convention.puntoFocal,
      cargoPuntoFocal: convention.cargoPuntoFocal,
      correoPuntoFocal: convention.correoPuntoFocal,
      responsabilidadFinanciera: convention.responsabilidadFinanciera,
      impactoEsperado: convention.impactoEsperado,
    };

    const { roadmap, model } = await generateConventionRoadmap({
      conventionData,
      resumenEjecutivo: readResumenEjecutivo(resumenDraft.contenido),
      instrucciones,
    });

    const stored = await saveRoadmap({
      conventionId,
      userId: session.id,
      roadmap,
      modelo: model,
    });

    await prisma.conventionAuditLog.create({
      data: {
        conventionId,
        userId: session.id,
        accion: "generar_hoja_de_ruta",
        descripcion: `Hoja de ruta generada por IA con ${roadmap.actividades.length} actividades (modelo: ${model})`,
        esIA: true,
      },
    });

    return NextResponse.json({ ok: true, roadmap: stored.roadmap, id: stored.id });
  } catch (err) {
    const isAIError = err instanceof OpenAIExtractionError;
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[roadmap] Error:", message, err);
    return NextResponse.json(
      { error: isAIError ? message : "Error al generar la hoja de ruta" },
      { status: 500 }
    );
  }
}
