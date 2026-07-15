"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** La ficha se imprime para la carpeta física, así que el botón es de primera. */
export function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
