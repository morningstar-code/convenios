import prisma from "@/lib/prisma";
import { normalizeConventionArrays } from "@/lib/convention-json";
import type { ConventionFilter } from "@/validators/convention.validator";
import { addDays } from "date-fns";

export async function findManyConventions(filter: ConventionFilter) {
  const {
    search,
    pais,
    contraparte,
    estatus,
    tipoInstrumento,
    porVencer,
    anioFirma,
    page,
    limit,
    orderBy,
    order,
  } = filter;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { contraparte: { contains: search } },
      { pais: { contains: search } },
      { objetivo: { contains: search } },
      { codigoInterno: { contains: search } },
      { puntoFocal: { contains: search } },
    ];
  }

  if (pais) where.pais = { contains: pais };
  if (contraparte) where.contraparte = { contains: contraparte };
  if (estatus) where.estatus = estatus;
  if (tipoInstrumento) where.tipoInstrumento = tipoInstrumento;

  if (typeof anioFirma === "number" && Number.isFinite(anioFirma)) {
    const start = new Date(Date.UTC(anioFirma, 0, 1));
    const endExclusive = new Date(Date.UTC(anioFirma + 1, 0, 1));
    where.fechaFirma = { gte: start, lt: endExclusive };
  }

  if (porVencer) {
    const days = parseInt(porVencer);
    const now = new Date();
    const cutoff = addDays(now, days);
    where.estatus = "vigente";
    where.fechaVencimientoCalculada = { gte: now, lte: cutoff };
    where.archivedAt = null;
  }

  const [rows, total] = await Promise.all([
    prisma.convention.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderBy]: order },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            originalName: true,
            blobUrl: true,
          },
        },
        drafts: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { contenido: true },
        },
        _count: { select: { documents: true, alerts: true } },
      },
    }),
    prisma.convention.count({ where }),
  ]);

  const data = rows.map(normalizeConventionArrays);
  return { data, total, page, limit };
}

export async function findConventionById(id: string) {
  const row = await prisma.convention.findUnique({
    where: { id },
    include: {
      documents: true,
      alerts: { orderBy: { createdAt: "desc" }, take: 10 },
      drafts: { orderBy: { createdAt: "desc" } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      createdByUser: { select: { id: true, name: true, email: true } },
      updatedByUser: { select: { id: true, name: true, email: true } },
      validatedByUser: { select: { id: true, name: true, email: true } },
      _count: { select: { documents: true, alerts: true } },
    },
  });
  if (!row) return null;
  return normalizeConventionArrays(row);
}

export async function createConvention(
  data: Record<string, unknown>,
  userId: string
) {
  return prisma.convention.create({
    data: { ...data, creadoPor: userId } as Parameters<typeof prisma.convention.create>[0]["data"],
  });
}

export async function updateConvention(
  id: string,
  data: Record<string, unknown>,
  userId: string
) {
  return prisma.convention.update({
    where: { id },
    data: { ...data, actualizadoPor: userId } as Parameters<typeof prisma.convention.update>[0]["data"],
  });
}

export async function archiveConvention(id: string, userId: string) {
  return prisma.convention.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      estatus: "cancelado",
      actualizadoPor: userId,
    },
  });
}

export async function deleteConvention(id: string) {
  return prisma.convention.delete({ where: { id } });
}

export async function getDashboardStats() {
  const now = new Date();
  const in30 = addDays(now, 30);
  const in60 = addDays(now, 60);
  const in90 = addDays(now, 90);

  const vigenteActivo = { estatus: "vigente" as const, archivedAt: null };

  const [total, vigentes, porVencer30, porVencer60, porVencer90, vencidos, pendientesValidacion] =
    await Promise.all([
      prisma.convention.count({ where: { archivedAt: null } }),
      prisma.convention.count({ where: vigenteActivo }),
      prisma.convention.count({
        where: {
          ...vigenteActivo,
          fechaVencimientoCalculada: { gte: now, lte: in30 },
        },
      }),
      prisma.convention.count({
        where: {
          ...vigenteActivo,
          fechaVencimientoCalculada: { gte: now, lte: in60 },
        },
      }),
      prisma.convention.count({
        where: {
          ...vigenteActivo,
          fechaVencimientoCalculada: { gte: now, lte: in90 },
        },
      }),
      prisma.convention.count({
        where: {
          ...vigenteActivo,
          fechaVencimientoCalculada: { lt: now },
        },
      }),
      prisma.convention.count({
        where: { validado: false, archivedAt: null },
      }),
    ]);

  return {
    total,
    vigentes,
    porVencer30,
    porVencer60,
    porVencer90,
    vencidos,
    pendientesValidacion,
  };
}

export async function getConventionsExpiringWithin(days: number) {
  const now = new Date();
  const cutoff = addDays(now, days);
  const rows = await prisma.convention.findMany({
    where: {
      estatus: "vigente",
      fechaVencimientoCalculada: { gte: now, lte: cutoff },
      archivedAt: null,
    },
    orderBy: { fechaVencimientoCalculada: "asc" },
    take: 10,
  });
  return rows.map(normalizeConventionArrays);
}
