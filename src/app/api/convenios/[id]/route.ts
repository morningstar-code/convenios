import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import {
  findConventionById,
  updateConvention,
  deleteConvention,
} from "@/repositories/convention.repository";
import { ConventionUpdateSchema } from "@/validators/convention.validator";
import { addMonths } from "date-fns";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const convention = await findConventionById(id);

  if (!convention) return NextResponse.json({ error: "Instrumento no encontrado" }, { status: 404 });

  return NextResponse.json(convention);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = ConventionUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await findConventionById(id);
    if (!existing) return NextResponse.json({ error: "Instrumento no encontrado" }, { status: 404 });

    if (existing.validado && (parsed.data as Record<string, unknown>).validado === false) {
      return NextResponse.json({ error: "No se puede modificar un instrumento validado sin desvalidarlo primero" }, { status: 409 });
    }

    const data = parsed.data;

    // Recalculate expiration if needed
    const fechaFirma = data.fechaFirma ? new Date(data.fechaFirma) : existing.fechaFirma;
    const duracionMeses = data.duracionMeses ?? existing.duracionMeses;
    let fechaVencimientoCalculada = existing.fechaVencimientoCalculada;

    if (fechaFirma && duracionMeses) {
      fechaVencimientoCalculada = addMonths(fechaFirma, duracionMeses);
    }

    const convention = await updateConvention(
      id,
      {
        ...data,
        fechaFirma: data.fechaFirma ? new Date(data.fechaFirma) : undefined,
        fechaVencimientoCalculada,
      },
      session.id
    );

    // Audit log
    await prisma.conventionAuditLog.create({
      data: {
        conventionId: id,
        userId: session.id,
        accion: "actualizar",
        descripcion: "Instrumento actualizado",
        cambios: data as unknown as import("@prisma/client").Prisma.InputJsonValue,
        esIA: false,
      },
    });

    return NextResponse.json(convention);
  } catch (err) {
    console.error("Update convention error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;

  try {
    await deleteConvention(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete convention error:", err);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
