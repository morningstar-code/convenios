"use client";

import { Button } from "@/components/ui/button";

export function CopyButton({ text }: { text: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigator.clipboard.writeText(text)}
    >
      Copiar texto
    </Button>
  );
}
