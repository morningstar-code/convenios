import { put, del, head } from "@vercel/blob";

export async function uploadDocumentToBlob(
  file: Buffer,
  filename: string,
  mimeType: string,
  conventionId: string
): Promise<{ url: string; pathname: string }> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `convenios/${conventionId}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: mimeType,
    addRandomSuffix: false,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
  };
}

export async function deleteDocumentFromBlob(pathname: string): Promise<void> {
  try {
    await del(pathname);
  } catch (err) {
    console.error("Error deleting blob:", err);
  }
}

export async function getBlobMetadata(
  url: string
): Promise<{ size: number; contentType: string } | null> {
  try {
    const info = await head(url);
    return {
      size: info.size,
      contentType: info.contentType,
    };
  } catch {
    return null;
  }
}
