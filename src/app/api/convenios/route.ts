import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { findManyConventions, createConvention } from "@/repositories/convention.repository";
import { ConventionCreateSchema, ConventionFilterSchema } from "@/validators/convention.validator";
import { addMonths } from "date-fns";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const porVencerRaw = searchParams.get("porVencer");
  const anioParse = searchParams.get("anio");
  let anioFirma: number | undefined;
  if (anioParse) {
    const y = Number.parseInt(anioParse, 10);
    if (Number.isFinite(y) && y >= 1900 && y <= 2200) anioFirma = y;
  }

  const filterRaw = {
    search: searchParams.get("search") || undefined,
    pais: searchParams.get("pais") || undefined,
    contraparte: searchParams.get("contraparte") || undefined,
    estatus: searchParams.get("estatus") || undefined,
    tipoInstrumento: searchParams.get("tipoInstrumento") || undefined,
    porVencer: porVencerRaw === "30" || porVencerRaw === "60" || porVencerRaw === "90" ? porVencerRaw : undefined,
    anioFirma,
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "20"),
    orderBy: searchParams.get("orderBy") || "createdAt",
    order: searchParams.get("order") || "desc",
  };

  const parsed = ConventionFilterSchema.safeParse(filterRaw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const result = await findManyConventions(parsed.data);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = ConventionCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Calculate expiration date
    let fechaVencimientoCalculada: Date | null = null;
    if (data.fechaFirma && data.duracionMeses) {
      fechaVencimientoCalculada = addMonths(new Date(data.fechaFirma), data.duracionMeses);
    }

    const convention = await createConvention(
      {
        ...data,
        fechaFirma: data.fechaFirma ? new Date(data.fechaFirma) : null,
        fechaVencimientoCalculada,
      },
      session.id
    );

    // Create audit log
    await prisma.conventionAuditLog.create({
      data: {
        conventionId: convention.id,
        userId: session.id,
        accion: "crear",
        descripcion: "Instrumento creado manualmente",
        esIA: false,
      },
    });

    return NextResponse.json(convention, { status: 201 });
  } catch (err) {
    console.error("Create convention error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
