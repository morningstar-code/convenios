/**
 * Sube PDF/archivos locales (public/uploads/…) a Vercel Blob y actualiza blobUrl en Postgres.
 * Requiere BLOB_READ_WRITE_TOKEN y DATABASE_URL (Postgres ya poblado).
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import prisma from "../src/lib/prisma";

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token?.startsWith("vercel_blob")) {
    throw new Error("Configura BLOB_READ_WRITE_TOKEN (token rw de Vercel Blob).");
  }

  const docs = await prisma.conventionDocument.findMany({
    where: {
      OR: [
        { blobPathname: { startsWith: "uploads/" } },
        { blobUrl: { contains: "/uploads/" } },
      ],
    },
  });

  let migrated = 0;
  for (const doc of docs) {
    const filename = doc.blobPathname.replace(/^uploads\//, "");
    const localPath = path.join(process.cwd(), "public", "uploads", filename);
    try {
      await fs.access(localPath);
    } catch {
      console.warn(`[omitido] No hay archivo local: ${localPath}`);
      continue;
    }
    const buf = await fs.readFile(localPath);
    const pathname = doc.blobPathname.startsWith("uploads/")
      ? doc.blobPathname
      : `uploads/${filename}`;
    const blob = await put(pathname, buf, {
      access: "public",
      token,
      contentType: doc.mimeType || "application/pdf",
    });
    await prisma.conventionDocument.update({
      where: { id: doc.id },
      data: { blobUrl: blob.url, blobPathname: blob.pathname },
    });
    migrated++;
    console.log(`✓ ${doc.originalName}`);
  }

  console.log(`Listo: ${migrated}/${docs.length} documentos subidos a Blob.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
