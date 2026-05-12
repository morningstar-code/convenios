"use client";

import { useState } from "react";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function OpenAITestButton() {
  const [loading, setLoading] = useState(false);

  const test = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health/openai");
      const data = await res.json();
      if (data.ok) {
        toast({
          title: `OpenAI OK — ${data.config?.modelExtract}`,
          description: `Latencia: ${data.latencyMs}ms · ${data.message}`,
          variant: "success",
        });
      } else {
        toast({
          title: "OpenAI no disponible",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error al verificar OpenAI",
        description: "No se pudo contactar el endpoint de salud.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={test} disabled={loading}>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Wifi className="h-3.5 w-3.5" />
      )}
      {loading ? "Verificando..." : "Probar conexión"}
    </Button>
  );
}
