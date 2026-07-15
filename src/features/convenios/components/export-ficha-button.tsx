"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { downloadDocx } from "@/lib/download-docx";

/** Descarga la ficha técnica del instrumento en Word. */
export function ExportFichaButton({ conventionId }: { conventionId: string }) {
  const [downloading, setDownloading] = useState(false);

  const run = async () => {
    setDownloading(true);
    try {
      await downloadDocx(`/api/convenios/${conventionId}/export-ficha`, "ficha-tecnica.docx");
      toast({ title: "Ficha descargada", variant: "success" });
    } catch (err) {
      toast({
        title: "No se pudo exportar la ficha",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={downloading}>
      {downloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Generando…
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" /> Exportar ficha
        </>
      )}
    </Button>
  );
}
