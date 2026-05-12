"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function AtendidaButton({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleMarkAttended = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/alertas/${alertId}/atender`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast({ title: "Alerta marcada como atendida", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "Error al atender alerta", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleMarkAttended} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      Atender
    </Button>
  );
}
