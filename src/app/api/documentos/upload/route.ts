import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { uploadFile, isLocalStorage } from "@/lib/storage";
import { createDocument, findExistingDocumentUpload } from "@/repositories/document.repository";

export const runtime = "nodejs";

const MAX_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const conventionId = formData.get("conventionId") as string | null;

    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    if (!conventionId) return NextResponse.json({ error: "ID de instrumento requerido" }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido. Solo PDF y DOCX." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo supera el tamaño máximo de 15 MB" }, { status: 400 });
    }

    const duplicate = await findExistingDocumentUpload({
      originalName: file.name,
      sizeBytes: file.size,
    });
    if (duplicate) {
      return NextResponse.json(
        {
          error: `Este archivo ya está subido: ${duplicate.originalName}. No se permiten documentos duplicados.`,
          duplicateDocumentId: duplicate.id,
          duplicateConventionId: duplicate.convention.id,
        },
        { status: 409 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pathname = `convenios/${conventionId}/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log(
      `[upload] Storing "${file.name}" via ${isLocalStorage() ? "local filesystem" : "Vercel Blob"}`
    );

    const stored = await uploadFile(buffer, pathname, file.type);

    const document = await createDocument({
      conventionId,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      blobUrl: stored.url,
      blobPathname: stored.pathname,
    });

    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    console.error("[upload] Error:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: `Error al subir el archivo: ${message}` }, { status: 500 });
  }
}
