import { addMonths } from "date-fns";
import prisma from "@/lib/prisma";
import { stringArrayToJson } from "@/lib/json-array";
import {
  createConvention,
  updateConvention,
  findConventionById,
} from "@/repositories/convention.repository";
import type { ConventionCreateInput, ConventionUpdateInput } from "@/validators/convention.validator";

export async function createConventionWithAlerts(
  data: ConventionCreateInput,
  userId: string
) {
  const fechaVencimientoCalculada = calculateExpiration(data);

  const convention = await createConvention(
    {
      ...data,
      fechaVencimientoCalculada,
      direccionesInvolucradas: stringArrayToJson(data.direccionesInvolucradas),
      modalidadesCooperacion: stringArrayToJson(data.modalidadesCooperacion),
      areasCooperacion: stringArrayToJson(data.areasCooperacion),
    },
    userId
  );

  await prisma.conventionAuditLog.create({
    data: {
      conventionId: convention.id,
      userId,
      accion: "crear",
      descripcion: "Instrumento creado manualmente",
      esIA: false,
    },
  });

  return convention;
}

export async function updateConventionWithAlerts(
  id: string,
  data: ConventionUpdateInput,
  userId: string
) {
  const existing = await findConventionById(id);
  if (!existing) throw new Error("Instrumento no encontrado");

  const merged = { ...existing, ...data };
  const fechaVencimientoCalculada = calculateExpiration(merged as ConventionCreateInput);

  const updatePayload: Record<string, unknown> = { ...data, fechaVencimientoCalculada };
  if (data.direccionesInvolucradas != null) {
    updatePayload.direccionesInvolucradas = stringArrayToJson(data.direccionesInvolucradas);
  }
  if (data.modalidadesCooperacion != null) {
    updatePayload.modalidadesCooperacion = stringArrayToJson(data.modalidadesCooperacion);
  }
  if (data.areasCooperacion != null) {
    updatePayload.areasCooperacion = stringArrayToJson(data.areasCooperacion);
  }

  const convention = await updateConvention(id, updatePayload, userId);

  await prisma.conventionAuditLog.create({
    data: {
      conventionId: id,
      userId,
      accion: "actualizar",
      descripcion: "Instrumento actualizado",
      cambios: data as unknown as import("@prisma/client").Prisma.InputJsonValue,
      esIA: false,
    },
  });

  return convention;
}

function calculateExpiration(
  data: Partial<ConventionCreateInput> & { fechaFirma?: string | Date | null; duracionMeses?: number | null }
): Date | null {
  if (!data.fechaFirma || !data.duracionMeses) return null;
  const start = typeof data.fechaFirma === "string" ? new Date(data.fechaFirma) : data.fechaFirma;
  return addMonths(start, data.duracionMeses);
}

/** Limpia alertas del sistema (no se regeneran automáticamente). */
export async function recalculateAllAlerts() {
  const deleted = await prisma.conventionAlert.deleteMany({});
  return { processed: deleted.count, total: deleted.count };
}
