import { NextResponse } from "next/server";
import { head } from "@vercel/blob";

function isSafeBlobPathname(pathname: string): boolean {
  if (!pathname.startsWith("uploads/")) return false;
  if (pathname.includes("..") || pathname.includes("\\")) return false;
  return pathname.length <= 512;
}

/**
 * GET ?pathname=uploads/...
 * Redirige a la URL canónica en Vercel Blob cuando la BD tiene enlaces locales/obsoletos.
 */
export async function GET(req: Request) {
  const pathname = new URL(req.url).searchParams.get("pathname")?.trim() ?? "";

  if (!isSafeBlobPathname(pathname)) {
    return NextResponse.json({ error: "pathname inválido" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token?.startsWith("vercel_blob")) {
    try {
      const meta = await head(pathname, { token });
      return NextResponse.redirect(meta.url, 302);
    } catch {
      /* fallback: ficheros locales en desarrollo */
    }
  }

  const origin = new URL(req.url).origin;
  return NextResponse.redirect(new URL(`/${pathname}`, origin).toString(), 302);
}
