/**
 * Migra datos desde SQLite (dev.db antigua) → PostgreSQL vacío (Neon / docker-compose).
 *
 * Previo: DATABASE_URL apuntando a Postgres + `npx prisma migrate deploy`
 *
 * SQLITE_IMPORT_PATH (opcional): ruta al .db, por defecto prisma/dev.db
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Prisma } from "@prisma/client";
import prisma, { disconnectPrismaAndPool } from "../src/lib/prisma";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1") return true;
  return false;
}

function asDate(v: unknown): Date | undefined {
  if (v == null || v === "") return undefined;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function asJson(v: unknown): Prisma.InputJsonValue {
  if (v == null) return [];
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as Prisma.InputJsonValue;
    } catch {
      return v;
    }
  }
  return v as Prisma.InputJsonValue;
}

function asDecimal(v: unknown): Prisma.Decimal | null {
  if (v == null || v === "") return null;
  try {
    return new Prisma.Decimal(String(v));
  } catch {
    return null;
  }
}

async function main() {
  const pgUrl = requireEnv("DATABASE_URL");
  if (!pgUrl.startsWith("postgres")) {
    throw new Error("DATABASE_URL debe ser PostgreSQL.");
  }

  const sqliteRel = process.env.SQLITE_IMPORT_PATH?.trim() || path.join("prisma", "dev.db");
  const sqlitePath = path.isAbsolute(sqliteRel)
    ? sqliteRel
    : path.resolve(process.cwd(), sqliteRel);

  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`No se encuentra SQLite: ${sqlitePath}`);
  }

  const sqlite = new Database(sqlitePath, { readonly: true });

  try {
    const userRows = sqlite.prepare(`SELECT * FROM users`).all() as Record<string, unknown>[];
    const sessionRows = sqlite.prepare(`SELECT * FROM sessions`).all() as Record<
      string,
      unknown
    >[];
    const conventionRows = sqlite.prepare(`SELECT * FROM conventions`).all() as Record<
      string,
      unknown
    >[];
    const docRows = sqlite.prepare(`SELECT * FROM convention_documents`).all() as Record<
      string,
      unknown
    >[];
    const draftRows = sqlite.prepare(`SELECT * FROM convention_drafts`).all() as Record<
      string,
      unknown
    >[];
    const alertRows = sqlite.prepare(`SELECT * FROM convention_alerts`).all() as Record<
      string,
      unknown
    >[];
    const auditRows = sqlite.prepare(`SELECT * FROM convention_audit_logs`).all() as Record<
      string,
      unknown
    >[];
    const aiRows = sqlite.prepare(`SELECT * FROM convention_ai_outputs`).all() as Record<
      string,
      unknown
    >[];

    await prisma.$transaction(
      async (tx) => {
        if (userRows.length)
          await tx.user.createMany({
            data: userRows.map((r) => ({
              id: String(r.id),
              email: String(r.email),
              name: String(r.name),
              password: String(r.password),
              role: r.role as "admin" | "viewer",
              active: asBool(r.active),
              createdAt: asDate(r.createdAt) ?? new Date(),
              updatedAt: asDate(r.updatedAt) ?? new Date(),
            })),
            skipDuplicates: true,
          });

        if (sessionRows.length)
          await tx.session.createMany({
            data: sessionRows.map((r) => ({
              id: String(r.id),
              userId: String(r.userId),
              token: String(r.token),
              expiresAt: asDate(r.expiresAt)!,
              createdAt: asDate(r.createdAt) ?? new Date(),
            })),
            skipDuplicates: true,
          });

        if (conventionRows.length)
          await tx.convention.createMany({
            data: conventionRows.map((r) => ({
              id: String(r.id),
              codigoInterno: r.codigoInterno != null ? String(r.codigoInterno) : null,
              tipoInstrumento: r.tipoInstrumento as never,
              contraparte: String(r.contraparte),
              pais: String(r.pais),
              fechaFirma: asDate(r.fechaFirma) ?? null,
              duracionTexto: r.duracionTexto != null ? String(r.duracionTexto) : null,
              duracionMeses: r.duracionMeses != null ? Number(r.duracionMeses) : null,
              fechaVencimientoCalculada: asDate(r.fechaVencimientoCalculada) ?? null,
              renovacionAutomatica: asBool(r.renovacionAutomatica),
              estatus: r.estatus as never,
              condicionTerminacion:
                r.condicionTerminacion != null ? String(r.condicionTerminacion) : null,
              diasPreaviso: r.diasPreaviso != null ? Number(r.diasPreaviso) : null,
              puntoFocal: String(r.puntoFocal),
              cargoPuntoFocal: r.cargoPuntoFocal != null ? String(r.cargoPuntoFocal) : null,
              correoPuntoFocal: r.correoPuntoFocal != null ? String(r.correoPuntoFocal) : null,
              direccionesInvolucradas: asJson(r.direccionesInvolucradas),
              objetivo: String(r.objetivo),
              modalidadesCooperacion: asJson(r.modalidadesCooperacion),
              areasCooperacion: asJson(r.areasCooperacion),
              impactoEsperado: r.impactoEsperado != null ? String(r.impactoEsperado) : null,
              responsabilidadFinanciera: asBool(r.responsabilidadFinanciera),
              montoReferencial: asDecimal(r.montoReferencial),
              observaciones: r.observaciones != null ? String(r.observaciones) : null,
              conclusionInterna: r.conclusionInterna != null ? String(r.conclusionInterna) : null,
              recomendacionPreliminar:
                r.recomendacionPreliminar != null ? String(r.recomendacionPreliminar) : null,
              validado: asBool(r.validado),
              validadoPor: r.validadoPor != null ? String(r.validadoPor) : null,
              validadoEn: asDate(r.validadoEn) ?? null,
              creadoPor: String(r.creadoPor),
              actualizadoPor: r.actualizadoPor != null ? String(r.actualizadoPor) : null,
              archivedAt: asDate(r.archivedAt) ?? null,
              createdAt: asDate(r.createdAt) ?? new Date(),
              updatedAt: asDate(r.updatedAt) ?? new Date(),
            })),
            skipDuplicates: true,
          });

        if (docRows.length)
          await tx.conventionDocument.createMany({
            data: docRows.map((r) => ({
              id: String(r.id),
              conventionId: String(r.conventionId),
              originalName: String(r.originalName),
              mimeType: String(r.mimeType),
              sizeBytes: Number(r.sizeBytes),
              blobUrl: String(r.blobUrl),
              blobPathname: String(r.blobPathname),
              extractedText: r.extractedText != null ? String(r.extractedText) : null,
              processedAt: asDate(r.processedAt) ?? null,
              processingError: r.processingError != null ? String(r.processingError) : null,
              createdAt: asDate(r.createdAt) ?? new Date(),
              updatedAt: asDate(r.updatedAt) ?? new Date(),
            })),
            skipDuplicates: true,
          });

        if (draftRows.length)
          await tx.conventionDraft.createMany({
            data: draftRows.map((r) => ({
              id: String(r.id),
              conventionId: String(r.conventionId),
              tipo: r.tipo as never,
              contenido: String(r.contenido),
              contenidoOriginalIA:
                r.contenidoOriginalIA != null ? String(r.contenidoOriginalIA) : null,
              modelo: String(r.modelo),
              documentoBase: r.documentoBase != null ? String(r.documentoBase) : null,
              generadoPor: r.generadoPor != null ? String(r.generadoPor) : null,
              aceptado: asBool(r.aceptado),
              editadoManualmente: asBool(r.editadoManualmente),
              editadoPor: r.editadoPor != null ? String(r.editadoPor) : null,
              editadoEn: asDate(r.editadoEn) ?? null,
              createdAt: asDate(r.createdAt) ?? new Date(),
              updatedAt: asDate(r.updatedAt) ?? new Date(),
            })),
            skipDuplicates: true,
          });

        if (alertRows.length)
          await tx.conventionAlert.createMany({
            data: alertRows.map((r) => ({
              id: String(r.id),
              tipo: r.tipo as never,
              severidad: r.severidad as never,
              titulo: String(r.titulo),
              descripcion: String(r.descripcion),
              conventionId: r.conventionId != null ? String(r.conventionId) : null,
              atendida: asBool(r.atendida),
              atendidaPor: r.atendidaPor != null ? String(r.atendidaPor) : null,
              atendidaEn: asDate(r.atendidaEn) ?? null,
              createdAt: asDate(r.createdAt) ?? new Date(),
            })),
            skipDuplicates: true,
          });

        if (auditRows.length)
          await tx.conventionAuditLog.createMany({
            data: auditRows.map((r) => ({
              id: String(r.id),
              conventionId: String(r.conventionId),
              userId: String(r.userId),
              accion: String(r.accion),
              descripcion: String(r.descripcion),
              cambios:
                r.cambios != null && String(r.cambios).trim() !== ""
                  ? (asJson(r.cambios) as Prisma.InputJsonValue)
                  : undefined,
              esIA: asBool(r.esIA),
              createdAt: asDate(r.createdAt) ?? new Date(),
            })),
            skipDuplicates: true,
          });

        if (aiRows.length)
          await tx.conventionAIOutput.createMany({
            data: aiRows.map((r) => ({
              id: String(r.id),
              conventionId: String(r.conventionId),
              documentId: r.documentId != null ? String(r.documentId) : null,
              userId: String(r.userId),
              tipo: String(r.tipo),
              modelo: String(r.modelo),
              prompt: r.prompt != null ? String(r.prompt) : null,
              resultado: asJson(r.resultado),
              aceptado: asBool(r.aceptado),
              confianza: r.confianza != null ? Number(r.confianza) : null,
              camposDudosos: asJson(r.camposDudosos),
              createdAt: asDate(r.createdAt) ?? new Date(),
            })),
            skipDuplicates: true,
          });
      },
      { timeout: 120_000 }
    );

    console.log(
      `✅ Importados usuarios=${userRows.length}, convenios=${conventionRows.length}, docs=${docRows.length}, borradores=${draftRows.length}, IA=${aiRows.length}`
    );
    console.log(
      "Si tenías PDF en public/uploads/, ejecuta npm run db:sync-uploads-to-blob con BLOB_READ_WRITE_TOKEN."
    );
  } finally {
    sqlite.close();
    await disconnectPrismaAndPool();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
