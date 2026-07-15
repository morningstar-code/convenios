import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Edit,
  FileUp,
  Sparkles,
  CheckCircle,
  Shield,
  Globe,
  Download,
  AlertTriangle,
  Bot,
  Radar,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { findConventionById, findConventionPickList } from "@/repositories/convention.repository";
import { findAIOutputsByConvention } from "@/repositories/ai-output.repository";
import { getSession } from "@/lib/auth";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatDateTime, formatBytes, formatConvenioDuracionDisplay } from "@/lib/utils";
import { resolveFechaFirmaForDisplay } from "@/lib/convention-fecha-display";
import { INSTRUMENT_TYPE_LABELS } from "@/types";
import type { ConventionStatus, InstrumentType } from "@/types";
import { ConventionActions } from "@/features/convenios/components/convention-actions";
import { ExtractButton } from "@/features/convenios/components/ai-action-buttons";
import { ConventionSwitcher } from "@/features/convenios/components/convention-switcher";
import { PrintButton } from "@/features/convenios/components/print-button";
import { ExportFichaButton } from "@/features/convenios/components/export-ficha-button";
import { FichaToc, type FichaSection } from "@/features/convenios/components/ficha-toc";
import { DocumentUploader } from "@/features/documentos/components/document-uploader";
import { SignatureEvidenceDialog } from "@/features/convenios/components/signature-evidence-dialog";
import { getDocumentPublicUrl } from "@/lib/document-url";
import { extractSignatureEvidence } from "@/lib/signature-evidence";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const SECTIONS: FichaSection[] = [
  { id: "f-identificacion", label: "Identificación" },
  { id: "f-objetivo", label: "Objetivo y alcance" },
  { id: "f-vigencia", label: "Vigencia" },
  { id: "f-focal", label: "Punto focal" },
  { id: "f-documentos", label: "Documentos" },
  { id: "f-trazabilidad", label: "Trazabilidad" },
];

/**
 * "3 · Ficha técnica" — todo el instrumento en una sola pantalla.
 * Antes esto eran cinco pestañas (General · IA · Documentos · Alertas ·
 * Historial). El borrador de IA y las alertas viven ahora en "4 · Seguimiento".
 */
export default async function ConventionFichaPage({ params }: PageProps) {
  const { id } = await params;
  const [convention, session, aiOutputs, pickList] = await Promise.all([
    findConventionById(id),
    getSession(),
    findAIOutputsByConvention(id),
    findConventionPickList(),
  ]);

  if (!convention) notFound();

  const isAdmin = session?.role === "admin";
  const isDraftConvention = convention.contraparte.startsWith("[Pendiente]");
  const latestDocument = [...convention.documents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  const latestAI = aiOutputs.find((o) => o.tipo === "extraccion");
  const hasLowConfidence = latestAI && (latestAI.confianza ?? 1) < 0.7;
  const hasDubiousFields = latestAI && latestAI.camposDudosos.length > 0;
  const signatureEvidence = extractSignatureEvidence(latestAI?.resultado, latestDocument);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* ── Avisos ──────────────────────────────────────────────────────── */}
      {latestAI && (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
            hasLowConfidence ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"
          }`}
        >
          <Bot
            className={`h-5 w-5 shrink-0 ${hasLowConfidence ? "text-amber-600" : "text-blue-600"}`}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-medium ${
                hasLowConfidence ? "text-amber-900" : "text-blue-900"
              }`}
            >
              {hasLowConfidence
                ? "Instrumento creado por IA con confianza media/baja — requiere revisión cuidadosa"
                : "Instrumento creado automáticamente por IA"}
            </p>
            {hasDubiousFields && (
              <p className="mt-0.5 text-xs text-amber-700">
                Campos con ambigüedad: {latestAI.camposDudosos.join(", ")}
              </p>
            )}
          </div>
          {latestAI.confianza !== null && (
            <Badge
              variant={
                (latestAI.confianza >= 0.8
                  ? "success"
                  : latestAI.confianza >= 0.5
                  ? "warning"
                  : "destructive") as "success" | "warning" | "destructive"
              }
              className="shrink-0"
            >
              {Math.round(latestAI.confianza * 100)}% confianza
            </Badge>
          )}
        </div>
      )}

      {!convention.validado && !isDraftConvention && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Este instrumento aún no ha sido validado. Revisa los campos y márcalo como validado
            cuando estés conforme.
          </p>
        </div>
      )}

      {/* ── Barra de acciones ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <ConventionSwitcher conventions={pickList} currentId={id} hrefTemplate="/convenios/:id" />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href={`/seguimiento?mou=${id}`}>
            <Button variant="outline" size="sm">
              <Radar className="h-4 w-4" />
              Seguimiento
            </Button>
          </Link>
          <PrintButton />
          <ExportFichaButton conventionId={id} />
          {isAdmin && (
            <>
              <Link href={`/convenios/${id}/editar`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              </Link>
              <ConventionActions conventionId={id} isArchived={!!convention.archivedAt} />
            </>
          )}
        </div>
      </div>

      {/* ── Ficha + índice ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_180px]">
        <Card>
          <CardContent className="p-6">
            {/* Cabecera del instrumento */}
            <div className="mb-6 flex flex-wrap items-start gap-4 border-b border-slate-200 pb-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                <Globe className="h-5 w-5 text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={convention.estatus as ConventionStatus} />
                  {convention.validado && (
                    <Badge variant="success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Validado
                    </Badge>
                  )}
                  {latestAI && (
                    <Badge variant="info">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Extraído por IA
                    </Badge>
                  )}
                  {convention.codigoInterno && (
                    <span className="font-mono text-xs text-slate-500">
                      {convention.codigoInterno}
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-slate-900">
                  {isDraftConvention ? (
                    <span className="italic text-slate-500">
                      Instrumento en proceso de extracción
                    </span>
                  ) : (
                    convention.contraparte
                  )}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {convention.pais}
                  <span className="mx-1.5 text-slate-300">·</span>
                  {INSTRUMENT_TYPE_LABELS[convention.tipoInstrumento as InstrumentType]}
                </p>
              </div>
            </div>

            {/* ── Identificación ─────────────────────────────────────────── */}
            <section id="f-identificacion" className="scroll-mt-24">
              <SectionTitle>Identificación</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Contraparte" value={convention.contraparte} large />
                <Field label="País" value={convention.pais} large />
                <Field
                  label="Tipo de instrumento"
                  value={INSTRUMENT_TYPE_LABELS[convention.tipoInstrumento as InstrumentType]}
                />
                <Field label="Código interno" value={convention.codigoInterno} mono />
                {convention.direccionesInvolucradas.length > 0 && (
                  <div className="sm:col-span-2">
                    <FieldLabel>Direcciones involucradas</FieldLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {convention.direccionesInvolucradas.map((dir, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                        >
                          {dir}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Divider />

            {/* ── Objetivo y alcance ─────────────────────────────────────── */}
            <section id="f-objetivo" className="scroll-mt-24">
              <SectionTitle>Objetivo y alcance</SectionTitle>
              <p className="max-w-[72ch] text-sm leading-relaxed text-slate-700">
                {convention.objetivo}
              </p>

              {convention.impactoEsperado && (
                <div className="mt-4">
                  <FieldLabel>Impacto esperado</FieldLabel>
                  <p className="max-w-[72ch] text-sm leading-relaxed text-slate-700">
                    {convention.impactoEsperado}
                  </p>
                </div>
              )}

              {convention.areasCooperacion.length > 0 && (
                <div className="mt-4">
                  <FieldLabel>Áreas de cooperación</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {convention.areasCooperacion.map((area, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {convention.modalidadesCooperacion.length > 0 && (
                <div className="mt-4">
                  <FieldLabel>Modalidades</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {convention.modalidadesCooperacion.map((mod, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <Divider />

            {/* ── Vigencia ───────────────────────────────────────────────── */}
            <section id="f-vigencia" className="scroll-mt-24">
              <SectionTitle>Vigencia</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Fecha de firma</FieldLabel>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(
                      resolveFechaFirmaForDisplay(convention.fechaFirma, convention.drafts)
                    )}
                  </p>
                  {signatureEvidence && (
                    <div className="mt-1.5">
                      <SignatureEvidenceDialog evidence={signatureEvidence} />
                    </div>
                  )}
                </div>
                <Field
                  label="Vencimiento calculado"
                  value={formatDate(convention.fechaVencimientoCalculada)}
                  large
                />
                <Field
                  label="Duración"
                  value={formatConvenioDuracionDisplay(
                    convention.duracionTexto,
                    convention.duracionMeses
                  )}
                />
                <Field
                  label="Renovación"
                  value={convention.renovacionAutomatica ? "Automática" : "No automática"}
                />
                <Field
                  label="Preaviso de terminación"
                  value={convention.diasPreaviso ? `${convention.diasPreaviso} días` : null}
                />
                <Field
                  label="Responsabilidad financiera"
                  value={
                    convention.responsabilidadFinanciera
                      ? convention.montoReferencial
                        ? `Sí — monto referencial ${convention.montoReferencial.toString()}`
                        : "Sí — sin monto referencial registrado"
                      : "No genera obligaciones económicas"
                  }
                />
                {convention.condicionTerminacion && (
                  <div className="sm:col-span-2">
                    <FieldLabel>Condición de terminación</FieldLabel>
                    <p className="max-w-[72ch] text-sm leading-relaxed text-slate-600">
                      {convention.condicionTerminacion}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <Divider />

            {/* ── Punto focal ────────────────────────────────────────────── */}
            <section id="f-focal" className="scroll-mt-24">
              <SectionTitle>Punto focal</SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nombre" value={convention.puntoFocal} large />
                <Field label="Cargo" value={convention.cargoPuntoFocal} />
                <Field label="Correo" value={convention.correoPuntoFocal} />
              </div>

              {(convention.observaciones || convention.conclusionInterna) && (
                <div className="mt-5 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-slate-500">
                    Notas internas
                  </p>
                  {convention.observaciones && (
                    <div>
                      <FieldLabel>Observaciones</FieldLabel>
                      <p className="max-w-[72ch] text-sm leading-relaxed text-slate-700">
                        {convention.observaciones}
                      </p>
                    </div>
                  )}
                  {convention.conclusionInterna && (
                    <>
                      {convention.observaciones && <Separator />}
                      <div>
                        <FieldLabel>Conclusión interna</FieldLabel>
                        <p className="max-w-[72ch] text-sm leading-relaxed text-slate-700">
                          {convention.conclusionInterna}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>

            <Divider />

            {/* ── Documentos ─────────────────────────────────────────────── */}
            <section id="f-documentos" className="scroll-mt-24">
              <SectionTitle>Documentos ({convention._count?.documents || 0})</SectionTitle>

              {convention.documents.length === 0 ? (
                <p className="py-4 text-sm text-slate-500">
                  No hay documentos adjuntos a este instrumento.
                </p>
              ) : (
                <div className="space-y-2">
                  {convention.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <FileUp className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {doc.originalName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatBytes(doc.sizeBytes)} · {formatDateTime(doc.createdAt)}
                          {doc.processedAt ? (
                            <span className="ml-1.5 font-medium text-emerald-600">
                              · Procesado por IA
                            </span>
                          ) : doc.processingError ? (
                            <span className="ml-1.5 text-red-600">· {doc.processingError}</span>
                          ) : (
                            <span className="ml-1.5 text-amber-600">· Sin procesar</span>
                          )}
                        </p>
                      </div>
                      {isAdmin && <ExtractButton documentId={doc.id} conventionId={id} />}
                      <a
                        href={getDocumentPublicUrl(doc) ?? doc.blobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" aria-label="Descargar documento">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {isAdmin && (
                <div className="mt-4 no-print">
                  <DocumentUploader conventionId={id} />
                </div>
              )}
            </section>

            <Divider />

            {/* ── Trazabilidad ───────────────────────────────────────────── */}
            <section id="f-trazabilidad" className="scroll-mt-24">
              <SectionTitle>Trazabilidad</SectionTitle>

              {convention.validado && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <Shield className="h-4 w-4 shrink-0" />
                  <span>
                    Validado por <strong>{convention.validatedByUser?.name}</strong> el{" "}
                    {formatDateTime(convention.validadoEn)}
                  </span>
                </div>
              )}

              {convention.auditLogs.length === 0 ? (
                <p className="py-2 text-sm text-slate-500">Sin historial registrado.</p>
              ) : (
                <div className="space-y-2.5">
                  {convention.auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <Badge
                        variant={log.esIA ? "info" : "secondary"}
                        className="mt-0.5 shrink-0"
                      >
                        {log.esIA ? (
                          <>
                            <Sparkles className="mr-1 h-3 w-3" />
                            IA
                          </>
                        ) : (
                          <>
                            <User className="mr-1 h-3 w-3" />
                            {log.user?.name?.split(" ")[0] ?? "Usuario"}
                          </>
                        )}
                      </Badge>
                      <p className="min-w-0 flex-1 text-slate-700">{log.descripcion}</p>
                      <span className="shrink-0 text-xs text-slate-400">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </CardContent>
        </Card>

        <FichaToc sections={SECTIONS} />
      </div>
    </div>
  );
}

/* ── Piezas de presentación ───────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
      {children}
    </h2>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-slate-400">
      {children}
    </p>
  );
}

function Field({
  label,
  value,
  large,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  large?: boolean;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p
        className={[
          "text-slate-900",
          large ? "text-sm font-semibold" : "text-sm",
          mono ? "font-mono text-xs" : "",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function Divider() {
  return <hr className="my-6 border-slate-100" />;
}
