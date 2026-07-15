import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { AlertType, AlertSeverity } from "@/types";

export type AlertWithConventionList = Prisma.ConventionAlertGetPayload<{
  include: {
    convention: {
      select: { id: true; contraparte: true; pais: true; estatus: true };
    };
  };
}>;

export async function createAlert(data: {
  tipo: AlertType;
  severidad: AlertSeverity;
  titulo: string;
  descripcion: string;
  conventionId?: string;
}) {
  return prisma.conventionAlert.create({ data });
}

export async function findAlerts(params?: {
  atendida?: boolean;
  severidad?: AlertSeverity;
  tipo?: AlertType;
  page?: number;
  limit?: number;
}): Promise<{
  data: AlertWithConventionList[];
  total: number;
  page: number;
  limit: number;
}> {
  const { atendida, severidad, tipo, page = 1, limit = 50 } = params || {};
  const skip = (page - 1) * limit;
  const where: Prisma.ConventionAlertWhereInput = {};

  if (atendida !== undefined) where.atendida = atendida;
  if (severidad) where.severidad = severidad;
  if (tipo) where.tipo = tipo;

  const [data, total] = await Promise.all([
    prisma.conventionAlert.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        convention: {
          select: { id: true, contraparte: true, pais: true, estatus: true },
        },
      },
    }),
    prisma.conventionAlert.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function markAlertAttended(id: string, userId: string) {
  return prisma.conventionAlert.update({
    where: { id },
    data: { atendida: true, atendidaPor: userId, atendidaEn: new Date() },
  });
}

export async function deleteAlertsForConvention(conventionId: string) {
  return prisma.conventionAlert.deleteMany({ where: { conventionId } });
}

/** Alertas sin atender — para el contador del menú. */
export async function countPendingAlerts(): Promise<number> {
  return prisma.conventionAlert.count({ where: { atendida: false } });
}

export async function getRecentAlerts(limit = 5) {
  return prisma.conventionAlert.findMany({
    where: { atendida: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      convention: { select: { id: true, contraparte: true, pais: true } },
    },
  });
}
