/**
 * PUT /api/ai/drafts/[draftId]
 * Saves a manually-edited ficha draft.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { addMonths } from "date-fns";
import type { Prisma } from "@prisma/client";
import { parseFichaDate } from "@/lib/ficha-date-parse";
import { parseDraftContenidoObject, pickFechaFirmaTextFromDraftRecord } from "@/lib/ficha-draft-json";

export const runtime = "nodejs";

const EditSchema = z.object({
  contenido: z.string().min(1, "contenido no puede estar vacío"),
});

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function usableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return null;

  const normalized = normalizeText(trimmed);
  const unavailable = [
    "informacion no disponible",
    "dato no disponible",
    "no disponible en el documento",
  ];

  return unavailable.some((phrase) => normalized.includes(phrase)) ? null : trimmed;
}

function parseDurationMonths(value: string | null): number | null {
  if (!value) return null;
  const normalized = normalizeText(value);
  if (normalized.includes("indefinid") || normalized.includes("sin vencimiento")) return null;

  const months = normalized.match(/(\d+)\s*mes(?:es)?/);
  if (months) return Number(months[1]);

  const years = normalized.match(/(\d+)\s*ano(?:s)?/);
  if (years) return Number(years[1]) * 12;

  return null;
}

function mapTipoInstrumento(value: string | null): Prisma.ConventionUpdateInput["tipoInstrumento"] | null {
  if (!value) return null;
  const normalized = normalizeText(value);
  if (normalized.includes("memorando")) return "memorando_entendimiento";
  if (normalized.includes("acuerdo")) return "acuerdo_cooperacion";
  if (normalized.includes("protocolo")) return "protocolo";
  if (normalized.includes("declaracion")) return "declaracion_conjunta";
  if (normalized.includes("marco")) return "convenio_marco";
  if (normalized.includes("especific")) return "convenio_especifico";
  return null;
}

function mapEstatus(value: string | null): Prisma.ConventionUpdateInput["estatus"] | null {
  if (!value) return null;
  const normalized = normalizeText(value);
  if (normalized.includes("cancelad") || normalized.includes("vencid")) return "cancelado";
  if (normalized.includes("vigente")) return "vigente";
  return null;
}

function buildConventionUpdatesFromFicha(
  contenido: string,
  existing: {
    fechaFirma: Date | null;
    duracionMeses: number | null;
  }
): Prisma.ConventionUpdateInput {
  const ficha = parseDraftContenidoObject(contenido);
  if (!ficha) return {};

  const updates: Prisma.ConventionUpdateInput = {};

  const fechaText = pickFechaFirmaTextFromDraftRecord(ficha);
  const fechaFirma = parseFichaDate(
    fechaText != null ? usableString(fechaText) : usableString(ficha.fechaFirma)
  );
  const duracionTexto = usableString(ficha.duracion);
  const duracionMeses = parseDurationMonths(duracionTexto);
  const tipoInstrumento = mapTipoInstrumento(usableString(ficha.tipoInstrumento));
  const estatus = mapEstatus(usableString(ficha.estatus));
  const condicionTerminacion = usableString(ficha.condicionTerminacion);
  const puntoFocal = usableString(ficha.puntoFocal);
  const objetivo = usableString(ficha.objetivo);
  const impactoEsperado = usableString(ficha.impactoEsperado);

  if (fechaFirma) updates.fechaFirma = fechaFirma;
  if (duracionTexto) updates.duracionTexto = duracionTexto;
  if (duracionMeses) updates.duracionMeses = duracionMeses;
  if (tipoInstrumento) updates.tipoInstrumento = tipoInstrumento;
  if (estatus) updates.estatus = estatus;
  if (condicionTerminacion) updates.condicionTerminacion = condicionTerminacion;
  if (puntoFocal) updates.puntoFocal = puntoFocal;
  if (objetivo) updates.objetivo = objetivo;
  if (impactoEsperado) updates.impactoEsperado = impactoEsperado;

  const finalFechaFirma = fechaFirma ?? existing.fechaFirma;
  const finalDuracionMeses = duracionMeses ?? existing.duracionMeses;
  const indefinite = duracionTexto ? normalizeText(duracionTexto).includes("indefinid") : false;

  if (indefinite) {
    updates.fechaVencimientoCalculada = null;
    updates.duracionMeses = null;
  } else if (finalFechaFirma && finalDuracionMeses) {
    updates.fechaVencimientoCalculada = addMonths(finalFechaFirma, finalDuracionMeses);
  }

  return updates;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { draftId } = await params;

  try {
    const body = await req.json();
    const parsed = EditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existing = await prisma.conventionDraft.findUnique({
      where: { id: draftId },
      include: {
        convention: {
          select: {
            fechaFirma: true,
            duracionMeses: true,
          },
        },
      },
    });
    if (!existing) return NextResponse.json({ error: "Borrador no encontrado" }, { status: 404 });

    const conventionUpdates = buildConventionUpdatesFromFicha(parsed.data.contenido, {
      fechaFirma: existing.convention.fechaFirma,
      duracionMeses: existing.convention.duracionMeses,
    });

    const [updated] = await prisma.$transaction([
      prisma.conventionDraft.update({
        where: { id: draftId },
        data: {
          contenido: parsed.data.contenido,
          // Keep a backup of the original AI-generated content on first edit
          contenidoOriginalIA: existing.contenidoOriginalIA ?? existing.contenido,
          editadoManualmente: true,
          editadoPor: session.id,
          editadoEn: new Date(),
        },
      }),
      prisma.convention.update({
        where: { id: existing.conventionId },
        data: conventionUpdates,
      }),
    ]);

    await prisma.conventionAuditLog.create({
      data: {
        conventionId: existing.conventionId,
        userId: session.id,
        accion: "editar_ficha",
        descripcion: "Resumen ejecutivo editado manualmente",
        esIA: false,
      },
    });

    return NextResponse.json({ ok: true, draft: updated });
  } catch (err) {
    console.error("[drafts PUT] Error:", err);
    return NextResponse.json({ error: "Error al guardar la ficha" }, { status: 500 });
  }
}
