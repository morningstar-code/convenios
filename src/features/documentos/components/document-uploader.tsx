"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface DocumentUploaderProps {
  conventionId: string;
}

export function DocumentUploader({ conventionId }: DocumentUploaderProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];

  const handleFile = async (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: "Tipo de archivo no permitido",
        description: "Solo se aceptan archivos PDF y DOCX",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        description: "El tamaño máximo permitido es 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conventionId", conventionId);

      const res = await fetch("/api/documentos/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Documento subido",
        description: `${file.name} ha sido subido correctamente.`,
        variant: "success",
      });
      router.refresh();
    } catch (err) {
      toast({
        title: "Error al subir",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <Card
      className={`border-2 border-dashed transition-colors cursor-pointer ${
        dragOver ? "border-slate-400 bg-slate-50" : "border-slate-200 hover:border-slate-300"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && fileRef.current?.click()}
    >
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-3" />
            <p className="text-sm text-slate-600">Subiendo documento...</p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 mb-3">
              <Upload className="h-6 w-6 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-900">
              Arrastra un documento aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-slate-500 mt-1">PDF o DOCX · Máximo 10MB</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              <span>Los documentos serán almacenados de forma segura en la nube</span>
            </div>
          </>
        )}
      </CardContent>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </Card>
  );
}
