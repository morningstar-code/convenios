-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'viewer');

-- CreateEnum
CREATE TYPE "ConventionStatus" AS ENUM ('vigente', 'cancelado');

-- CreateEnum
CREATE TYPE "InstrumentType" AS ENUM ('convenio_marco', 'convenio_especifico', 'memorando_entendimiento', 'acuerdo_cooperacion', 'protocolo', 'declaracion_conjunta', 'otro');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('vencimiento_30', 'vencimiento_60', 'vencimiento_90', 'vencido', 'revision_manual', 'sin_validar', 'documento_sin_procesar');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "DraftType" AS ENUM ('ficha_tecnica', 'resumen_ejecutivo', 'recomendacion_preliminar');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'viewer',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conventions" (
    "id" TEXT NOT NULL,
    "codigoInterno" TEXT,
    "tipoInstrumento" "InstrumentType" NOT NULL,
    "contraparte" TEXT NOT NULL,
    "pais" TEXT NOT NULL,
    "fechaFirma" TIMESTAMP(3),
    "duracionTexto" TEXT,
    "duracionMeses" INTEGER,
    "fechaVencimientoCalculada" TIMESTAMP(3),
    "renovacionAutomatica" BOOLEAN NOT NULL DEFAULT false,
    "estatus" "ConventionStatus" NOT NULL DEFAULT 'vigente',
    "condicionTerminacion" TEXT,
    "diasPreaviso" INTEGER,
    "puntoFocal" TEXT NOT NULL,
    "cargoPuntoFocal" TEXT,
    "correoPuntoFocal" TEXT,
    "direccionesInvolucradas" JSONB NOT NULL,
    "objetivo" TEXT NOT NULL,
    "modalidadesCooperacion" JSONB NOT NULL,
    "areasCooperacion" JSONB NOT NULL,
    "impactoEsperado" TEXT,
    "responsabilidadFinanciera" BOOLEAN NOT NULL DEFAULT false,
    "montoReferencial" DECIMAL(65,30),
    "observaciones" TEXT,
    "conclusionInterna" TEXT,
    "recomendacionPreliminar" TEXT,
    "validado" BOOLEAN NOT NULL DEFAULT false,
    "validadoPor" TEXT,
    "validadoEn" TIMESTAMP(3),
    "creadoPor" TEXT NOT NULL,
    "actualizadoPor" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convention_documents" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "extractedText" TEXT,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convention_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convention_alerts" (
    "id" TEXT NOT NULL,
    "tipo" "AlertType" NOT NULL,
    "severidad" "AlertSeverity" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "conventionId" TEXT,
    "atendida" BOOLEAN NOT NULL DEFAULT false,
    "atendidaPor" TEXT,
    "atendidaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convention_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convention_drafts" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "tipo" "DraftType" NOT NULL,
    "contenido" TEXT NOT NULL,
    "contenidoOriginalIA" TEXT,
    "modelo" TEXT NOT NULL,
    "documentoBase" TEXT,
    "generadoPor" TEXT,
    "aceptado" BOOLEAN NOT NULL DEFAULT false,
    "editadoManualmente" BOOLEAN NOT NULL DEFAULT false,
    "editadoPor" TEXT,
    "editadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convention_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convention_audit_logs" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cambios" JSONB,
    "esIA" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convention_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convention_ai_outputs" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "documentId" TEXT,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "prompt" TEXT,
    "resultado" JSONB NOT NULL,
    "aceptado" BOOLEAN NOT NULL DEFAULT false,
    "confianza" DOUBLE PRECISION,
    "camposDudosos" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convention_ai_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conventions" ADD CONSTRAINT "conventions_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conventions" ADD CONSTRAINT "conventions_actualizadoPor_fkey" FOREIGN KEY ("actualizadoPor") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conventions" ADD CONSTRAINT "conventions_validadoPor_fkey" FOREIGN KEY ("validadoPor") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convention_documents" ADD CONSTRAINT "convention_documents_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "conventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convention_alerts" ADD CONSTRAINT "convention_alerts_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "conventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convention_alerts" ADD CONSTRAINT "convention_alerts_atendidaPor_fkey" FOREIGN KEY ("atendidaPor") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convention_drafts" ADD CONSTRAINT "convention_drafts_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "conventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convention_audit_logs" ADD CONSTRAINT "convention_audit_logs_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "conventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convention_audit_logs" ADD CONSTRAINT "convention_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convention_ai_outputs" ADD CONSTRAINT "convention_ai_outputs_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "conventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convention_ai_outputs" ADD CONSTRAINT "convention_ai_outputs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "convention_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convention_ai_outputs" ADD CONSTRAINT "convention_ai_outputs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
