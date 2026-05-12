import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: {
    default: "Sistema de Gestión de Memorandos / Acuerdos",
    template: "%s | Memorandos / Acuerdos",
  },
  description: "Plataforma institucional para la gestión inteligente de memorandos y acuerdos de cooperación",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-50 text-slate-900">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
