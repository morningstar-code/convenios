/**
 * POST /api/documentos/upload-standalone
 *
 * Upload a document WITHOUT a convention yet.
 * The convention will be created automatically after AI processing.
 *
 * Uses Vercel Blob in production; falls back to ./public/uploads/ locally.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { uploadFileFromWeb, isLocalStorage } from "@/lib/storage";
import prisma from "@/lib/prisma";
import { stringArrayToJson } from "@/lib/json-array";
import { findExistingDocumentUpload } from "@/repositories/document.repository";
import type { ConventionStatus } from "@prisma/client";

export const runtime = "nodejs";

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
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
    const estatusRaw = (formData.get("estatus") as string | null)?.trim().toLowerCase();
    const estatus: ConventionStatus =
      estatusRaw === "cancelado" ? "cancelado" : "vigente";

    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo PDF y DOCX." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `El archivo supera el tamaño máximo de ${MAX_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      );
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
    const pathname = `pendientes/${Date.now()}-${safeName}`;

    console.log(
      `[upload-standalone] Storing "${file.name}" via ${isLocalStorage() ? "local filesystem" : "Vercel Blob"}`
    );

    const stored = await uploadFileFromWeb(file, pathname);

    const document = await prisma.conventionDocument.create({
      data: {
        convention: {
          create: {
            tipoInstrumento: "otro",
            contraparte: `[Pendiente] ${file.name}`,
            pais: "Por determinar",
            estatus,
            puntoFocal: "Por determinar",
            objetivo: "Objeto pendiente de extracción IA",
            responsabilidadFinanciera: false,
            renovacionAutomatica: false,
            validado: false,
            creadoPor: session.id,
            direccionesInvolucradas: stringArrayToJson([]),
            modalidadesCooperacion: stringArrayToJson([]),
            areasCooperacion: stringArrayToJson([]),
          },
        },
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        blobUrl: stored.url,
        blobPathname: stored.pathname,
      },
      include: {
        convention: { select: { id: true } },
      },
    });

    return NextResponse.json(
      {
        documentId: document.id,
        conventionId: document.convention.id,
        filename: file.name,
        size: file.size,
        url: stored.url,
        storage: isLocalStorage() ? "local" : "blob",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[upload-standalone] Error:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al subir el archivo: ${message}` },
      { status: 500 }
    );
  }
}
