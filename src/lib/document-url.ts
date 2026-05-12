const VERCEL_BLOB_PUBLIC_MARKER = ".public.blob.vercel-storage.com";

function needsBlobRedirect(blobUrl: string): boolean {
  const raw = blobUrl.trim();
  if (!raw) return true;
  if (raw.includes(VERCEL_BLOB_PUBLIC_MARKER)) return false;

  if (raw.startsWith("/uploads/")) return true;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") return true;
      const pathname = new URL(raw).pathname;
      if (pathname.includes("/uploads/")) return true;
    } catch {
      return true;
    }
  }

  return false;
}

/**
 * URL para enlaces de descarga/visualización del PDF.
 * Cuando la BD guardó URLs locales u obsoletas, usa `/api/documentos/blob-redirect`
 * para resolver el pathname actual contra Vercel Blob (y caer a `/uploads/…` en local).
 */
export function getDocumentPublicUrl(
  document: { blobUrl: string; blobPathname: string } | undefined | null
): string | undefined {
  if (!document?.blobUrl?.trim()) return undefined;

  const blobUrl = document.blobUrl.trim();
  const pathname = document.blobPathname?.trim() ?? "";

  if (!pathname.startsWith("uploads/")) {
    return blobUrl;
  }

  if (!needsBlobRedirect(blobUrl)) {
    return blobUrl;
  }

  const qs = new URLSearchParams({ pathname }).toString();
  return `/api/documentos/blob-redirect?${qs}`;
}
