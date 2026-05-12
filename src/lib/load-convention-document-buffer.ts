import { head } from "@vercel/blob";

const BLOB_MARKER = ".public.blob.vercel-storage.com";

async function readLocalUploadsFile(blobPathname: string): Promise<Buffer> {
  const path = await import("path");
  const fs = await import("fs/promises");
  if (!blobPathname.startsWith("uploads/")) {
    throw new Error("blobPathname inválido para lectura local");
  }
  const filename = blobPathname.replace(/^uploads\//, "");
  return fs.readFile(path.join(process.cwd(), "public", "uploads", filename));
}

function isLocalhostUrl(blobUrl: string): boolean {
  try {
    const host = new URL(blobUrl).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Descarga bytes del PDF para pipelines de IA (servidor).
 * Orden: URL canónica de Blob → resolución por pathname + token → fichero local (solo dev) → fetch directo.
 */
export async function loadConventionDocumentBuffer(doc: {
  blobUrl: string;
  blobPathname: string;
}): Promise<Buffer> {
  const blobUrl = doc.blobUrl.trim();
  const pathname = doc.blobPathname?.trim() ?? "";

  if (blobUrl.includes(BLOB_MARKER)) {
    const res = await fetch(blobUrl);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token?.startsWith("vercel_blob") && pathname.startsWith("uploads/")) {
    try {
      const meta = await head(pathname, { token });
      const res = await fetch(meta.url);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch {
      /* siguiente estrategia */
    }
  }

  if (
    pathname.startsWith("uploads/") &&
    (blobUrl.startsWith("/uploads/") || (isLocalhostUrl(blobUrl) && blobUrl.includes("/uploads/")))
  ) {
    return readLocalUploadsFile(pathname);
  }

  const res = await fetch(blobUrl);
  if (!res.ok) {
    throw new Error(`No se pudo descargar el documento: HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
