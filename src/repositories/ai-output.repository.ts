import prisma from "@/lib/prisma";
import { jsonToStringArray } from "@/lib/json-array";
import type { Prisma } from "@prisma/client";

const listInclude = {
  user: { select: { name: true, email: true } },
  document: { select: { originalName: true } },
} as const;

export type ConventionAIOutputListRow = Prisma.ConventionAIOutputGetPayload<{
  include: typeof listInclude;
}>;

export type NormalizedConventionAIOutputListRow = Omit<
  ConventionAIOutputListRow,
  "camposDudosos"
> & { camposDudosos: string[] };

function normalizeAIOutput(o: ConventionAIOutputListRow): NormalizedConventionAIOutputListRow {
  return {
    ...o,
    camposDudosos: jsonToStringArray(o.camposDudosos),
  };
}

const latestExtractionInclude = {
  document: { select: { originalName: true, blobUrl: true } },
} as const;

export type ConventionAIOutputExtractionRow = Prisma.ConventionAIOutputGetPayload<{
  include: typeof latestExtractionInclude;
}>;

export type NormalizedConventionAIOutputExtractionRow = Omit<
  ConventionAIOutputExtractionRow,
  "camposDudosos"
> & { camposDudosos: string[] };

export async function findAIOutputsByConvention(
  conventionId: string
): Promise<NormalizedConventionAIOutputListRow[]> {
  const rows = await prisma.conventionAIOutput.findMany({
    where: { conventionId },
    orderBy: { createdAt: "desc" },
    include: listInclude,
  });
  return rows.map(normalizeAIOutput);
}

function normalizeExtractionRow(
  o: ConventionAIOutputExtractionRow
): NormalizedConventionAIOutputExtractionRow {
  return {
    ...o,
    camposDudosos: jsonToStringArray(o.camposDudosos),
  };
}

export async function findLatestExtractionByConvention(
  conventionId: string
): Promise<NormalizedConventionAIOutputExtractionRow | null> {
  const row = await prisma.conventionAIOutput.findFirst({
    where: { conventionId, tipo: "extraccion" },
    orderBy: { createdAt: "desc" },
    include: latestExtractionInclude,
  });
  if (!row) return null;
  return normalizeExtractionRow(row);
}
