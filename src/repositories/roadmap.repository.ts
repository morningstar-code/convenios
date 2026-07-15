/**
 * Persistencia de la Hoja de Ruta.
 *
 * Se guarda como ConventionAIOutput con tipo "hoja_de_ruta": ese modelo ya
 * tiene `tipo` libre (String), `resultado` en Json y `aceptado`, así que la
 * función entra sin cambiar el esquema de la base. Toda la app habla con la
 * hoja de ruta a través de este módulo: si algún día merece su propia tabla,
 * solo cambia este archivo.
 */

import prisma from "@/lib/prisma";
import { RoadmapSchema, type Roadmap } from "@/validators/roadmap.schema";

export const ROADMAP_OUTPUT_TYPE = "hoja_de_ruta";

export interface StoredRoadmap {
  id: string;
  roadmap: Roadmap;
  modelo: string;
  aceptado: boolean;
  createdAt: Date;
  generadoPor: string | null;
}

function parseRow(row: {
  id: string;
  resultado: unknown;
  modelo: string;
  aceptado: boolean;
  createdAt: Date;
  user?: { name: string } | null;
}): StoredRoadmap | null {
  const parsed = RoadmapSchema.safeParse(row.resultado);
  if (!parsed.success) {
    console.warn(`[roadmap.repository] hoja de ruta ${row.id} con formato inválido`);
    return null;
  }
  return {
    id: row.id,
    roadmap: parsed.data,
    modelo: row.modelo,
    aceptado: row.aceptado,
    createdAt: row.createdAt,
    generadoPor: row.user?.name ?? null,
  };
}

export async function findLatestRoadmap(conventionId: string): Promise<StoredRoadmap | null> {
  const row = await prisma.conventionAIOutput.findFirst({
    where: { conventionId, tipo: ROADMAP_OUTPUT_TYPE },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });
  return row ? parseRow(row) : null;
}

export async function saveRoadmap(args: {
  conventionId: string;
  userId: string;
  roadmap: Roadmap;
  modelo: string;
}): Promise<StoredRoadmap> {
  const row = await prisma.conventionAIOutput.create({
    data: {
      conventionId: args.conventionId,
      userId: args.userId,
      tipo: ROADMAP_OUTPUT_TYPE,
      modelo: args.modelo,
      resultado: args.roadmap as unknown as object,
      camposDudosos: [],
    },
    include: { user: { select: { name: true } } },
  });

  const parsed = parseRow(row);
  if (!parsed) throw new Error("La hoja de ruta guardada no se pudo releer");
  return parsed;
}

/** Cuáles de estos instrumentos ya tienen hoja de ruta. Lo usa el comparador. */
export async function findConventionIdsWithRoadmap(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  const rows = await prisma.conventionAIOutput.findMany({
    where: { conventionId: { in: ids }, tipo: ROADMAP_OUTPUT_TYPE },
    select: { conventionId: true },
    distinct: ["conventionId"],
  });

  return new Set(rows.map((r) => r.conventionId));
}

export async function acceptRoadmap(id: string): Promise<void> {
  await prisma.conventionAIOutput.update({
    where: { id },
    data: { aceptado: true },
  });
}
