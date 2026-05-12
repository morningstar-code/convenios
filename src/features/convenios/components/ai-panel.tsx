"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Pencil,
  X,
  Save,
  FileDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { FichaConvenioCard, type FichaDraftMeta } from "@/features/convenios/components/ficha-convenio-card";
import type { SignatureEvidence } from "@/features/convenios/components/signature-evidence-dialog";
import type { FichaConvenio } from "@/lib/openai";
import { sanitizeFichaConvenio } from "@/lib/ficha-utils";
import { normalizeFichaDuracionCell } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Draft {
  id: string;
  tipo: string;
  contenido: string;
  modelo: string;
  aceptado: boolean;
  editadoManualmente?: boolean;
  editadoPor?: string | null;
  editadoEn?: Date | string | null;
  createdAt: Date | string;
}

interface AIPanelProps {
  conventionId: string;
  drafts: Draft[];
  isAdmin: boolean;
  documentReference?: {
    url: string;
    label: string;
  };
  signatureEvidence?: SignatureEvidence;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tryParseFicha(contenido: string): FichaConvenio | null {
  try {
    const p = JSON.parse(contenido);
    if (p && typeof p.nombreDocumento === "string") {
      return sanitizeFichaConvenio(p as FichaConvenio);
    }
  } catch { /* not JSON */ }
  return null;
}

function fichaToPlainText(ficha: FichaConvenio): string {
  const lines = [
    ficha.nombreDocumento,
    "",
    `Tipo de Instrumento: ${ficha.tipoInstrumento}`,
    `Fecha de Firma: ${ficha.fechaFirma}`,
    `Duración: ${normalizeFichaDuracionCell(ficha.duracion)}`,
    `Estatus: ${ficha.estatus}`,
    `Condición de Terminación: ${ficha.condicionTerminacion}`,
    `Punto Focal: ${ficha.puntoFocal}`,
    `Direcciones Involucradas:\n${ficha.direccionesInvolucradas}`,
    `Enlace: ${ficha.enlace}`,
    "",
    `OBJETIVO\n${ficha.objetivo}`,
    "",
    `MODALIDADES DE COOPERACIÓN\n${ficha.modalidadesCooperacion}`,
    "",
    `ACTIVIDADES\n${ficha.actividades}`,
    "",
    `ÁREAS DE COOPERACIÓN TÉCNICA\n${ficha.areasCooperacion}`,
    "",
    `TEMAS SUGERIDOS\n${ficha.temasSugeridos}`,
    "",
    `RESPONSABILIDAD FINANCIERA\n${ficha.responsabilidadFinanciera}`,
    "",
    `IMPACTO ESPERADO\n${ficha.impactoEsperado}`,
    "",
    `CONCLUSIÓN\n${ficha.conclusion}`,
  ];
  return lines.join("\n");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AIPanel({
  conventionId,
  drafts,
  isAdmin,
  documentReference,
  signatureEvidence,
}: AIPanelProps) {
  const router = useRouter();

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [pendingFicha, setPendingFicha] = useState<FichaConvenio | null>(null);

  const latestDraft = drafts[0] ?? null;
  const ficha = latestDraft ? tryParseFicha(latestDraft.contenido) : null;

  const draftMeta: FichaDraftMeta | undefined = latestDraft
    ? {
        id: latestDraft.id,
        editadoManualmente: latestDraft.editadoManualmente ?? false,
        editadoPor: latestDraft.editadoPor,
        editadoEn: latestDraft.editadoEn,
        createdAt: latestDraft.createdAt,
        modelo: latestDraft.modelo,
      }
    : undefined;

  // ── Generate ──────────────────────────────────────────────────────────────

  const generate = async () => {
    setGenerating(true);
    setEditMode(false);
    setPendingFicha(null);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conventionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al generar");

      toast({
        title: "Resumen generado",
        description: "El resumen ejecutivo fue generado correctamente.",
        variant: "success",
      });
      router.refresh();
    } catch (err) {
      toast({
        title: "Error al generar",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // ── Edit / Cancel ─────────────────────────────────────────────────────────

  function startEdit() {
    if (!ficha) return;
    setPendingFicha({ ...ficha });
    setEditMode(true);
  }

  function cancelEdit() {
    setPendingFicha(null);
    setEditMode(false);
  }

  // ── Save edited ───────────────────────────────────────────────────────────

  const saveEdit = async () => {
    if (!pendingFicha || !latestDraft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ai/drafts/${latestDraft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: JSON.stringify(pendingFicha) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");

      toast({
        title: "Ficha guardada",
        description: "Los cambios fueron guardados correctamente.",
        variant: "success",
      });
      setEditMode(false);
      setPendingFicha(null);
      router.refresh();
    } catch (err) {
      toast({
        title: "Error al guardar",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Download Word ─────────────────────────────────────────────────────────

  const downloadWord = async () => {
    if (!latestDraft) return;

    // If there are unsaved edits, save first
    if (editMode && pendingFicha) {
      await saveEdit();
    }

    setDownloading(true);
    try {
      const res = await fetch(`/api/ai/drafts/${latestDraft.id}/export-word`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al generar el Word");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match ? decodeURIComponent(match[1]) : "ficha-convenio.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({ title: "Word descargado", variant: "success" });
    } catch (err) {
      toast({
        title: "Error al descargar",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // ── Copy all ──────────────────────────────────────────────────────────────

  const copyAll = async () => {
    const source = editMode && pendingFicha ? pendingFicha : ficha;
    if (!source) return;
    await navigator.clipboard.writeText(fichaToPlainText(source));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const displayFicha = editMode && pendingFicha ? pendingFicha : ficha;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          Resumen Ejecutivo
          {draftMeta?.editadoManualmente && (
            <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              Editado manualmente
            </span>
          )}
        </h3>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Copy */}
            {displayFicha && (
              <Button variant="outline" size="sm" onClick={copyAll} disabled={generating}>
                {copied
                  ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copiado</>
                  : <><Copy className="h-3.5 w-3.5" /> Copiar</>
                }
              </Button>
            )}

            {/* Download Word */}
            {displayFicha && (
              <Button
                variant="outline"
                size="sm"
                onClick={downloadWord}
                disabled={downloading || generating}
              >
                {downloading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando...</>
                  : <><FileDown className="h-3.5 w-3.5" /> Word</>
                }
              </Button>
            )}

            {/* Edit / Save / Cancel */}
            {displayFicha && !editMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={startEdit}
                disabled={generating}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            )}

            {editMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelEdit}
                  className="text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...</>
                    : <><Save className="h-3.5 w-3.5" /> Guardar</>
                  }
                </Button>
              </>
            )}

            {/* Generate / Regenerate */}
            {!editMode && (
              <Button
                size="sm"
                onClick={generate}
                disabled={generating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {generating ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando...</>
                ) : displayFicha ? (
                  <><RefreshCw className="h-3.5 w-3.5" /> Regenerar</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5" /> Generar con IA</>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Edit mode notice */}
      {editMode && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <Pencil className="h-4 w-4 shrink-0 text-blue-600" />
          <span>
            Modo edición activo — modifica el contenido directamente en cada campo y presiona{" "}
            <strong>Guardar</strong> para confirmar los cambios.
          </span>
        </div>
      )}

      {/* Ficha / Empty state */}
      {displayFicha ? (
        <FichaConvenioCard
          ficha={displayFicha}
          meta={draftMeta}
          editMode={editMode}
          onEditChange={(updated) => setPendingFicha(updated)}
          documentReference={documentReference}
          signatureEvidence={signatureEvidence}
        />
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">No hay resumen ejecutivo aún</p>
            {isAdmin && (
              <>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Presiona &quot;Generar con IA&quot; para crear el resumen ejecutivo del instrumento
                </p>
                <Button
                  onClick={generate}
                  disabled={generating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Generar con IA</>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generating overlay notice */}
      {generating && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-blue-600" />
          <span>
            La IA está analizando el documento completo y generando el resumen ejecutivo…
            esto puede tomar 20-40 segundos.
          </span>
        </div>
      )}
    </div>
  );
}
