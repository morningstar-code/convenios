import prisma from "@/lib/prisma";
import { jsonToStringArray } from "@/lib/json-array";
import type { Prisma } from "@prisma/client";

function normalizeAIOutput<
  T extends { camposDudosos: Prisma.JsonValue },
>(o: T) {
  return {
    ...o,
    camposDudosos: jsonToStringArray(o.camposDudosos),
  };
}

export async function findAIOutputsByConvention(conventionId: string) {
  const rows = await prisma.conventionAIOutput.findMany({
    where: { conventionId },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      document: { select: { originalName: true } },
    },
  });
  return rows.map(normalizeAIOutput);
}

export async function findLatestExtractionByConvention(conventionId: string) {
  const row = await prisma.conventionAIOutput.findFirst({
    where: { conventionId, tipo: "extraccion" },
    orderBy: { createdAt: "desc" },
    include: {
      document: { select: { originalName: true, blobUrl: true } },
    },
  });
  if (!row) return null;
  return normalizeAIOutput(row);
}
