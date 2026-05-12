"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Info,
  X,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALLOWED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

type FileStatus = "pending" | "uploading" | "processing" | "done" | "error";

interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
  progress: string;
  result?: {
    conventionId: string;
    documentId: string;
    extraction: {
      confianza: number;
      campos_dudosos: string[];
      pipeline?: { path: string; model: string; openaiLatencyMs: number };
      normalized_preview?: {
        contraparte?: string;
        pais?: string;
        tipo_instrumento?: string;
      };
    };
  };
  error?: string;
}

export default function NuevoDocumentoPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentEstatus, setDocumentEstatus] = useState<"vigente" | "cancelado">("vigente");

  const allDone = files.length > 0 && files.every((f) => f.status === "done" || f.status === "error");
  const hasFiles = files.length > 0;
  const hasPending = files.some((f) => f.status === "pending");

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const newItems: FileItem[] = [];
    let skippedDuplicate = false;
    const seen = new Set(files.map((f) => `${f.file.name.toLowerCase()}-${f.file.size}`));

    for (const file of Array.from(incoming)) {
      if (!ALLOWED.includes(file.type)) continue;
      if (file.size > 15 * 1024 * 1024) continue;
      const fileKey = `${file.name.toLowerCase()}-${file.size}`;
      if (seen.has(fileKey)) {
        skippedDuplicate = true;
        continue;
      }
      seen.add(fileKey);
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: "pending",
        progress: "",
      });
    }
    if (newItems.length === 0 && incoming.length > 0) {
      setGlobalError(
        skippedDuplicate
          ? "Ese archivo ya está seleccionado. No se permiten documentos duplicados."
          : "Los archivos seleccionados no son válidos (solo PDF/DOCX, máx 15MB)."
      );
      return;
    }
    setGlobalError(
      skippedDuplicate
        ? "Se omitieron archivos repetidos en esta selección."
        : ""
    );
    setFiles((prev) => [...prev, ...newItems]);
  }, [files]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setGlobalError("");
  };

  const updateFile = (id: string, update: Partial<FileItem>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...update } : f)));
  };

  const processOne = async (item: FileItem) => {
    try {
      updateFile(item.id, { status: "uploading", progress: "Subiendo documento..." });

      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("estatus", documentEstatus);

      const uploadRes = await fetch("/api/documentos/upload-standalone", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const e = await uploadRes.json();
        throw new Error(e.error || "Error al subir");
      }

      const { documentId } = await uploadRes.json();

      updateFile(item.id, { status: "processing", progress: "Analizando con IA (esto puede tomar 30-60s)..." });

      const processRes = await fetch("/api/ai/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });

      if (!processRes.ok) {
        const e = await processRes.json();
        throw new Error(e.error || "Error en procesamiento IA");
      }

      const data = await processRes.json();
      updateFile(item.id, { status: "done", progress: "Completado", result: data });
    } catch (err) {
      updateFile(item.id, {
        status: "error",
        progress: "",
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  };

  const runAll = async () => {
    setIsProcessing(true);
    setGlobalError("");

    const pending = files.filter((f) => f.status === "pending" || f.status === "error");
    for (const item of pending) {
      await processOne(item);
    }

    setIsProcessing(false);
    router.refresh();
  };

  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (c >= 0.5) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Procesar documentos con IA</h1>
        <p className="text-sm text-slate-500 mt-1">
          Sube uno o varios PDF/DOCX de memorandos o acuerdos de cooperación y la IA los analizará todos automáticamente.
        </p>
      </div>

      {/* Pipeline visual */}
      <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
        {[
          { label: "1. Subir documentos", active: hasFiles },
          { label: "2. Extraer con IA", active: isProcessing },
          { label: "3. Crear instrumentos", active: allDone },
          { label: "4. Revisar y validar", active: false },
        ].map((step, i) => (
          <span key={i} className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border",
                step.active
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-400 border-slate-200"
              )}
            >
              {step.label}
            </span>
            {i < 3 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
          </span>
        ))}
      </div>

      {/* Estatus selector */}
      {!allDone && (
        <Card>
          <CardContent className="py-4 px-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="doc-estatus">Estatus de los instrumentos</Label>
              <p className="text-xs text-slate-500">
                Por defecto <strong>vigente</strong>. Aplica a todos los documentos que subas.
              </p>
            </div>
            <Select
              value={documentEstatus}
              onValueChange={(v) => setDocumentEstatus(v as "vigente" | "cancelado")}
            >
              <SelectTrigger id="doc-estatus" className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vigente">Vigente</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Upload zone */}
      {!allDone && (
        <Card
          className={cn(
            "border-2 border-dashed transition-all cursor-pointer",
            dragOver
              ? "border-slate-500 bg-slate-50 scale-[1.01]"
              : hasFiles
              ? "border-slate-300 bg-white"
              : "border-slate-200 hover:border-slate-300"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => !isProcessing && fileRef.current?.click()}
        >
          <CardContent className="py-10 flex flex-col items-center text-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Upload className="h-7 w-7 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {hasFiles ? "Agregar más documentos" : "Arrastra tus documentos aquí"}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                o haz clic para seleccionar archivos
              </p>
              <p className="text-xs text-slate-400 mt-2">
                PDF o DOCX · Máximo 15 MB cada uno · Puedes seleccionar varios a la vez
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.doc"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Error */}
      {globalError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      {/* File list */}
      {hasFiles && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              {files.length} documento{files.length !== 1 ? "s" : ""} seleccionado{files.length !== 1 ? "s" : ""}
              {isProcessing && (
                <span className="ml-2 text-slate-500">
                  — Procesando {files.filter((f) => f.status === "uploading" || f.status === "processing").length > 0 ? `${doneCount + errorCount + 1} de ${files.length}` : ""}
                </span>
              )}
              {allDone && (
                <span className="ml-2 text-emerald-600">
                  — {doneCount} completado{doneCount !== 1 ? "s" : ""}{errorCount > 0 ? `, ${errorCount} con error` : ""}
                </span>
              )}
            </p>
            {!isProcessing && !allDone && (
              <button
                onClick={clearAll}
                className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Quitar todos
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {files.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg border text-sm",
                  item.status === "done"
                    ? "bg-emerald-50 border-emerald-200"
                    : item.status === "error"
                    ? "bg-red-50 border-red-200"
                    : item.status === "uploading" || item.status === "processing"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white border-slate-200"
                )}
              >
                {/* Icon */}
                {item.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : item.status === "error" ? (
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                ) : item.status === "uploading" || item.status === "processing" ? (
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                )}

                {/* Name & info */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{item.file.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.status === "pending" && `${(item.file.size / 1024 / 1024).toFixed(1)} MB — pendiente`}
                    {item.status === "uploading" && item.progress}
                    {item.status === "processing" && item.progress}
                    {item.status === "done" && item.result && (
                      <>
                        Confianza: {Math.round(item.result.extraction.confianza * 100)}%
                        {item.result.extraction.normalized_preview?.contraparte &&
                          ` · ${item.result.extraction.normalized_preview.contraparte}`}
                        {item.result.extraction.normalized_preview?.pais &&
                          ` · ${item.result.extraction.normalized_preview.pais}`}
                      </>
                    )}
                    {item.status === "error" && (
                      <span className="text-red-600">{item.error}</span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                {item.status === "done" && item.result && (
                  <Link href={`/convenios/${item.result.conventionId}`}>
                    <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0">
                      Revisar <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
                {item.status === "pending" && !isProcessing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(item.id);
                    }}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {item.status === "error" && !isProcessing && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs shrink-0"
                    onClick={() => {
                      updateFile(item.id, { status: "pending", error: undefined });
                    }}
                  >
                    Reintentar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Process all button */}
      {hasPending && !isProcessing && (
        <Button size="lg" className="w-full gap-2" onClick={runAll}>
          <Sparkles className="h-5 w-5" />
          Procesar {files.filter((f) => f.status === "pending").length} documento{files.filter((f) => f.status === "pending").length !== 1 ? "s" : ""} con IA
        </Button>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-blue-600" />
          <span>
            Procesando documentos con IA… cada uno toma 30-60 segundos.
            No cierres esta ventana.
          </span>
        </div>
      )}

      {/* All done summary */}
      {allDone && doneCount > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900">
                ¡Procesamiento completado!
              </p>
              <p className="text-sm text-emerald-700 mt-0.5">
                {doneCount} instrumento{doneCount !== 1 ? "s" : ""} creado{doneCount !== 1 ? "s" : ""} exitosamente
                {errorCount > 0 && `, ${errorCount} con errores`}.
              </p>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Los instrumentos quedaron registrados como{" "}
              <strong>{documentEstatus === "cancelado" ? "Cancelado" : "Vigente"}</strong>.
              Puedes cambiar el estatus desde el resumen ejecutivo de cada instrumento.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/convenios" className="flex-1">
              <Button className="w-full gap-2">
                Ver todos los memorandos / acuerdos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setFiles([]);
                setGlobalError("");
              }}
            >
              Procesar más documentos
            </Button>
          </div>
        </div>
      )}

      {/* Info box */}
      {!hasFiles && (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-slate-700 mb-3">
              ¿Qué hace el sistema automáticamente?
            </p>
            <div className="space-y-2.5">
              {[
                "Extrae texto del PDF o DOCX",
                "Identifica contraparte, país, fechas, duración, objetivo y 15+ campos más",
                "Crea el instrumento borrador sin intervención manual",
                "Calcula la fecha de vencimiento según el documento",
                "Genera resumen ejecutivo y recomendación preliminar",
                "Marca campos ambiguos para revisión humana",
                "Puedes subir varios documentos y procesarlos todos a la vez",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
