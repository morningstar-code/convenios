import prisma from "@/lib/prisma";

export async function createDocument(data: {
  conventionId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  blobUrl: string;
  blobPathname: string;
}) {
  return prisma.conventionDocument.create({ data });
}

export function normalizeDocumentName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function findExistingDocumentUpload(params: {
  originalName: string;
  sizeBytes: number;
}) {
  const documents = await prisma.conventionDocument.findMany({
    where: {
      sizeBytes: params.sizeBytes,
    },
    select: {
      id: true,
      originalName: true,
      convention: {
        select: {
          id: true,
          contraparte: true,
        },
      },
    },
  });

  const normalizedIncomingName = normalizeDocumentName(params.originalName);
  return (
    documents.find(
      (document) => normalizeDocumentName(document.originalName) === normalizedIncomingName
    ) ?? null
  );
}

export async function findDocumentsByConvention(conventionId: string) {
  return prisma.conventionDocument.findMany({
    where: { conventionId },
    orderBy: { createdAt: "desc" },
  });
}

export async function findDocumentById(id: string) {
  return prisma.conventionDocument.findUnique({
    where: { id },
    include: { convention: { select: { id: true, contraparte: true, estatus: true } } },
  });
}

export async function updateDocumentExtraction(
  id: string,
  data: {
    extractedText?: string;
    processedAt?: Date;
    processingError?: string | null;
  }
) {
  return prisma.conventionDocument.update({ where: { id }, data });
}

export async function getAllDocuments(params?: {
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 50 } = params || {};
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.conventionDocument.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        convention: {
          select: { id: true, contraparte: true, pais: true, estatus: true },
        },
      },
    }),
    prisma.conventionDocument.count(),
  ]);

  return { data, total, page, limit };
}
