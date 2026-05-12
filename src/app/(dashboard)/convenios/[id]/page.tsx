import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Edit,
  FileUp,
  Sparkles,
  CheckCircle,
  Shield,
  Calendar,
  Globe,
  User,
  Building2,
  Download,
  AlertTriangle,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { findConventionById } from "@/repositories/convention.repository";
import { findAIOutputsByConvention } from "@/repositories/ai-output.repository";
import { getSession } from "@/lib/auth";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatDateTime, formatBytes, formatConvenioDuracionDisplay } from "@/lib/utils";
import { resolveFechaFirmaForDisplay } from "@/lib/convention-fecha-display";
import { INSTRUMENT_TYPE_LABELS } from "@/types";
import type { ConventionStatus, InstrumentType } from "@/types";
import { ConventionActions } from "@/features/convenios/components/convention-actions";
import { DocumentUploader } from "@/features/documentos/components/document-uploader";
import { ExtractButton } from "@/features/convenios/components/ai-action-buttons";
import { AIPanel } from "@/features/convenios/components/ai-panel";
import {
  SignatureEvidenceDialog,
  type SignatureEvidence,
} from "@/features/convenios/components/signature-evidence-dialog";
import { getDocumentPublicUrl } from "@/lib/document-url";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function getSignatureEvidence(
  latestAI: Awaited<ReturnType<typeof findAIOutputsByConvention>>[number] | undefined,
  latestDocument: { blobUrl: string; blobPathname: string; originalName: string } | undefined
): SignatureEvidence | undefined {
  const result = latestAI?.resultado;
  if (!result || typeof result !== "object" || Array.isArray(result)) return undefined;

  const raw = (result as { raw?: unknown }).raw;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const fechaFirma = (raw as { fecha_firma?: unknown }).fecha_firma;
  if (!fechaFirma || typeof fechaFirma !== "object" || Array.isArray(fechaFirma)) {
    return undefined;
  }

  const evidence = (fechaFirma as { evidence?: unknown }).evidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return undefined;

  const page = (evidence as { page?: unknown }).page;
  const text = (evidence as { text?: unknown }).text;

  if (typeof text !== "string" && typeof page !== "number") return undefined;

  return {
    page: typeof page === "number" ? page : null,
    text: typeof text === "string" ? text : null,
    documentUrl: getDocumentPublicUrl(latestDocument),
    documentLabel: latestDocument?.originalName,
  };
}

export default async function ConventionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [convention, session, aiOutputs] = await Promise.all([
    findConventionById(id),
    getSession(),
    findAIOutputsByConvention(id),
  ]);

  if (!convention) notFound();

  const isAdmin = session?.role === "admin";
  const isDraftConvention = convention.contraparte.startsWith("[Pendiente]");
  const latestDocument = [...convention.documents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  // Determine if this convention was AI-generated (has dubious fields or low confidence)
  const latestAI = aiOutputs.find((o) => o.tipo === "extraccion");
  const hasLowConfidence = latestAI && (latestAI.confianza ?? 1) < 0.7;
  const hasDubiousFields = latestAI && latestAI.camposDudosos.length > 0;
  const signatureEvidence = getSignatureEvidence(latestAI, latestDocument);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* AI-generated banner */}
      {latestAI && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            hasLowConfidence
              ? "bg-amber-50 border-amber-200"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <Bot
            className={`h-5 w-5 shrink-0 ${
              hasLowConfidence ? "text-amber-600" : "text-blue-600"
            }`}
          />
          <div className="flex-1 min-w-0">
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
              <p className="text-xs text-amber-700 mt-0.5">
                Campos con ambigüedad:{" "}
                {latestAI.camposDudosos.join(", ")}
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

      {/* Not-validated banner */}
      {!convention.validado && !isDraftConvention && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            Este instrumento aún no ha sido validado. Revisa los campos y marca como validado cuando estés conforme.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <StatusBadge status={convention.estatus as ConventionStatus} />
            {convention.validado && (
              <Badge variant="success">
                <CheckCircle className="h-3 w-3 mr-1" />
                Validado
              </Badge>
            )}
            {latestAI && (
              <Badge variant="info">
                <Sparkles className="h-3 w-3 mr-1" />
                Procesado por IA
              </Badge>
            )}
            {convention.codigoInterno && (
              <span className="text-sm font-mono text-slate-500">
                {convention.codigoInterno}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isDraftConvention ? (
              <span className="text-slate-500 italic">Instrumento en proceso de extracción</span>
            ) : (
              convention.contraparte
            )}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm flex-wrap">
            <Globe className="h-4 w-4" />
            <span>{convention.pais}</span>
            <span className="text-slate-300">·</span>
            <span>
              {INSTRUMENT_TYPE_LABELS[convention.tipoInstrumento as InstrumentType]}
            </span>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Link href={`/convenios/${id}/editar`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </Link>
            <ConventionActions conventionId={id} isArchived={!!convention.archivedAt} />
          </div>
        )}
      </div>

      {/* Quick info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickInfo
          icon={Calendar}
          label="Fecha de firma"
          value={formatDate(
            resolveFechaFirmaForDisplay(convention.fechaFirma, convention.drafts)
          )}
          action={signatureEvidence ? <SignatureEvidenceDialog evidence={signatureEvidence} /> : undefined}
        />
        <QuickInfo icon={Calendar} label="Vencimiento" value={formatDate(convention.fechaVencimientoCalculada)} />
        <QuickInfo icon={User} label="Punto focal" value={convention.puntoFocal} small />
        <QuickInfo icon={Building2} label="Documentos" value={String(convention._count?.documents || 0)} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue={latestAI ? "ia" : "general"}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ia">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Automatización IA
            {(hasDubiousFields || hasLowConfidence) && (
              <span className="ml-1.5 h-2 w-2 rounded-full bg-amber-400 inline-block" />
            )}
          </TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos ({convention._count?.documents || 0})
          </TabsTrigger>
          <TabsTrigger value="alertas">
            Alertas ({convention._count?.alerts || 0})
          </TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        {/* ── General ─────────────────────────────────────────────────────── */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Objetivo y alcance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Objetivo</p>
                <p className="text-sm text-slate-800 leading-relaxed">
                  {convention.objetivo}
                </p>
              </div>
              {convention.impactoEsperado && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Impacto esperado</p>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {convention.impactoEsperado}
                  </p>
                </div>
              )}
              {convention.areasCooperacion.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Áreas de cooperación</p>
                  <div className="flex flex-wrap gap-1.5">
                    {convention.areasCooperacion.map((area, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-full"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {convention.modalidadesCooperacion.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Modalidades</p>
                  <div className="flex flex-wrap gap-1.5">
                    {convention.modalidadesCooperacion.map((mod, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vigencia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 min-w-24 shrink-0">Duración:</span>
                  <span className="text-slate-900">
                    {formatConvenioDuracionDisplay(
                      convention.duracionTexto,
                      convention.duracionMeses
                    )}
                  </span>
                </div>
                <FieldRow
                  label="Meses"
                  value={convention.duracionMeses ? `${convention.duracionMeses} meses` : null}
                />
                <FieldRow
                  label="Preaviso"
                  value={convention.diasPreaviso ? `${convention.diasPreaviso} días` : null}
                />
                <FieldRow
                  label="Renovación"
                  value={convention.renovacionAutomatica ? "Automática" : "No automática"}
                />
                {convention.condicionTerminacion && (
                  <div>
                    <p className="text-xs text-slate-500">Condición de terminación</p>
                    <p className="text-slate-700 mt-0.5 text-sm">
                      {convention.condicionTerminacion}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Punto focal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <FieldRow label="Nombre" value={convention.puntoFocal} />
                <FieldRow label="Cargo" value={convention.cargoPuntoFocal} />
                <FieldRow label="Correo" value={convention.correoPuntoFocal} />
                {convention.direccionesInvolucradas.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Direcciones involucradas</p>
                    <div className="flex flex-wrap gap-1">
                      {convention.direccionesInvolucradas.map((dir, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded"
                        >
                          {dir}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {(convention.observaciones ||
            convention.conclusionInterna ||
            convention.recomendacionPreliminar) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observaciones internas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {convention.observaciones && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Observaciones</p>
                    <p className="text-slate-700 leading-relaxed">
                      {convention.observaciones}
                    </p>
                  </div>
                )}
                {convention.conclusionInterna && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Conclusión interna</p>
                      <p className="text-slate-700 leading-relaxed">
                        {convention.conclusionInterna}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {convention.validado && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              <Shield className="h-4 w-4" />
              <span>
                Validado por{" "}
                <strong>{convention.validatedByUser?.name}</strong> el{" "}
                {formatDateTime(convention.validadoEn)}
              </span>
            </div>
          )}
        </TabsContent>

        {/* ── IA Panel ────────────────────────────────────────────────────── */}
        <TabsContent value="ia" className="mt-4">
          <AIPanel
            conventionId={id}
            drafts={convention.drafts as Parameters<typeof AIPanel>[0]["drafts"]}
            isAdmin={isAdmin}
            signatureEvidence={signatureEvidence}
            documentReference={
              latestDocument
                ? {
                    url: getDocumentPublicUrl(latestDocument) ?? latestDocument.blobUrl,
                    label: latestDocument.originalName,
                  }
                : undefined
            }
          />
        </TabsContent>

        {/* ── Documents ───────────────────────────────────────────────────── */}
        <TabsContent value="documentos" className="mt-4 space-y-4">
          {isAdmin && <DocumentUploader conventionId={id} />}
          {convention.documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <FileUp className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No hay documentos adjuntos</p>
                {isAdmin && (
                  <p className="text-xs mt-1">
                    Sube documentos PDF o DOCX para procesarlos con IA
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {convention.documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <FileUp className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {doc.originalName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatBytes(doc.sizeBytes)} · {formatDateTime(doc.createdAt)}
                        </p>
                        {doc.processedAt ? (
                          <span className="text-xs text-emerald-600 font-medium">
                            ✓ Procesado por IA
                          </span>
                        ) : doc.processingError ? (
                          <span className="text-xs text-red-600">
                            Error: {doc.processingError}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600">
                            Pendiente de procesamiento
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin && (
                        <ExtractButton documentId={doc.id} conventionId={id} />
                      )}
                      <a
                        href={getDocumentPublicUrl(doc) ?? doc.blobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Alerts ──────────────────────────────────────────────────────── */}
        <TabsContent value="alertas" className="mt-4">
          {convention.alerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <p className="text-sm">No hay alertas activas para este instrumento</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {convention.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    alert.severidad === "critical"
                      ? "bg-red-50 border-red-200"
                      : alert.severidad === "warning"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {alert.titulo}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {alert.descripcion}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDateTime(alert.createdAt)}
                    </p>
                  </div>
                  {alert.atendida && <Badge variant="success">Atendida</Badge>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Audit log ───────────────────────────────────────────────────── */}
        <TabsContent value="historial" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {convention.auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Sin historial registrado
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {convention.auditLogs.map((log) => (
                    <div key={log.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {log.descripcion}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {log.esIA && (
                              <span className="inline-flex items-center gap-1 mr-2 text-blue-600">
                                <Sparkles className="h-3 w-3" />
                                IA ·
                              </span>
                            )}
                            {formatDateTime(log.createdAt)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {log.accion}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuickInfo({
  icon: Icon,
  label,
  value,
  small,
  action,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  small?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2 text-slate-500 text-xs mb-1">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        {action}
      </div>
      <p className={`font-semibold text-slate-900 ${small ? "text-sm" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-500 min-w-24 shrink-0">{label}:</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}
