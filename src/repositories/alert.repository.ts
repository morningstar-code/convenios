import prisma from "@/lib/prisma";
import type { AlertType, AlertSeverity } from "@/types";

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
}) {
  const { atendida, severidad, tipo, page = 1, limit = 50 } = params || {};
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};

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
