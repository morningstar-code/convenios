import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Database, Brain, Shield, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { OpenAITestButton } from "@/features/configuracion/components/openai-test-button";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const session = await getSession();

  const openaiConfigured = !!process.env.OPENAI_API_KEY;
  const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;
  const dbConfigured = !!process.env.DATABASE_URL;
  const keyPrefix = openaiConfigured
    ? process.env.OPENAI_API_KEY!.slice(0, 10) + "…"
    : "—";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1">
          Estado del sistema y variables de entorno activas
        </p>
      </div>

      {/* System status summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatusCard ok={dbConfigured} label="Base de datos" />
        <StatusCard ok={openaiConfigured} label="OpenAI API" />
        <StatusCard ok={blobConfigured} label="Vercel Blob" />
      </div>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Inteligencia Artificial — OpenAI
            </CardTitle>
            <OpenAITestButton />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row
            label="OPENAI_API_KEY"
            value={openaiConfigured ? `Configurada (${keyPrefix})` : "No configurada"}
            highlight={openaiConfigured ? "success" : "error"}
          />
          <Row
            label="OPENAI_MODEL_EXTRACT"
            value={process.env.OPENAI_MODEL_EXTRACT || "gpt-4.1 (default)"}
          />
          <Row
            label="OPENAI_MODEL_SUMMARY"
            value={process.env.OPENAI_MODEL_SUMMARY || "gpt-4.1 (default)"}
          />
          <Row
            label="OPENAI_MODEL_RECOMMEND"
            value={process.env.OPENAI_MODEL_RECOMMEND || "gpt-4.1 (default)"}
          />
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Prueba la conectividad en{" "}
              <Link
                href="/api/health/openai"
                target="_blank"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                /api/health/openai
                <ExternalLink className="h-3 w-3" />
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Almacenamiento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row
            label="Vercel Blob"
            value={blobConfigured ? "Configurado" : "No configurado"}
            highlight={blobConfigured ? "success" : "error"}
          />
          <Row
            label="Base de datos (PostgreSQL)"
            value={dbConfigured ? "Configurada" : "No configurada"}
            highlight={dbConfigured ? "success" : "error"}
          />
          {!blobConfigured && (
            <p className="text-xs text-amber-600 mt-1">
              Sin Vercel Blob, los documentos no se pueden subir.{" "}
              <a
                href="https://vercel.com/docs/storage/vercel-blob"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Ver instrucciones
              </a>
            </p>
          )}
        </CardContent>
      </Card>

      {/* System */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row
            label="Nombre"
            value={process.env.NEXT_PUBLIC_APP_NAME || "Sistema de Gestión de Memorandos / Acuerdos"}
          />
          <Row label="Versión" value="1.0.0" />
          <Row label="Entorno" value={process.env.NODE_ENV || "development"} />
          <Row label="URL" value={process.env.APP_URL || "http://localhost:3000"} />
        </CardContent>
      </Card>

      {/* Session */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sesión actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Usuario" value={session?.name || "—"} />
          <Row label="Correo" value={session?.email || "—"} />
          <Row label="Rol" value={session?.role || "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={`rounded-lg border p-4 flex items-center gap-3 ${
        ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
      )}
      <span
        className={`text-sm font-medium ${ok ? "text-emerald-900" : "text-red-900"}`}
      >
        {label}
      </span>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "success" | "error";
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-slate-500 font-mono text-xs">{label}</span>
      {highlight ? (
        <Badge variant={highlight === "success" ? "success" : "destructive"}>
          {value}
        </Badge>
      ) : (
        <span className="font-medium text-slate-800 text-right">{value}</span>
      )}
    </div>
  );
}
