/**
 * Abstraction layer for document storage.
 *
 * Production (Vercel):  uses @vercel/blob when BLOB_READ_WRITE_TOKEN is set.
 * Local development:    saves files to ./public/uploads/ and serves them
 *                       as static assets via Next.js.
 *
 * This lets the full AI pipeline work locally without a Blob token.
 */

import path from "path";
import fs from "fs/promises";

const IS_REAL_BLOB =
  !!process.env.BLOB_READ_WRITE_TOKEN &&
  process.env.BLOB_READ_WRITE_TOKEN !== "vercel_blob_rw_placeholder" &&
  process.env.BLOB_READ_WRITE_TOKEN.startsWith("vercel_blob");

export async function uploadFile(
  fileBuffer: Buffer,
  pathname: string,
  mimeType: string
): Promise<{ url: string; pathname: string }> {
  if (IS_REAL_BLOB) {
    const { put } = await import("@vercel/blob");
    const blob = await put(pathname, fileBuffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: false,
    });
    return { url: blob.url, pathname: blob.pathname };
  }

  // ── Local fallback ──────────────────────────────────────────────────────
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  // Flatten the pathname to avoid nested dirs in local mode
  const safeFilename = pathname.replace(/\//g, "__");
  const filePath = path.join(uploadsDir, safeFilename);

  await fs.writeFile(filePath, fileBuffer);

  const appUrl = process.env.APP_URL || "http://localhost:3001";
  const url = `${appUrl}/uploads/${safeFilename}`;

  console.log(`[storage] Local fallback — saved to ${filePath}`);
  console.log(`[storage] Served at ${url}`);

  return { url, pathname: `uploads/${safeFilename}` };
}

export async function uploadFileFromWeb(
  file: File,
  pathname: string
): Promise<{ url: string; pathname: string }> {
  if (IS_REAL_BLOB) {
    const { put } = await import("@vercel/blob");
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return { url: blob.url, pathname: blob.pathname };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadFile(buffer, pathname, file.type);
}

export async function deleteFile(pathname: string): Promise<void> {
  if (IS_REAL_BLOB) {
    const { del } = await import("@vercel/blob");
    await del(pathname);
    return;
  }

  // Local fallback — delete from public/uploads
  try {
    const filename = pathname.replace(/^uploads\//, "");
    const filePath = path.join(process.cwd(), "public", "uploads", filename);
    await fs.unlink(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
}

export function isLocalStorage(): boolean {
  return !IS_REAL_BLOB;
}
