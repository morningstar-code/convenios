"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { FichaConvenio } from "@/lib/openai";
import { sanitizeFichaText } from "@/lib/ficha-utils";
import { normalizeFichaDuracionCell } from "@/lib/utils";
import {
  SignatureEvidenceDialog,
  type SignatureEvidence,
} from "@/features/convenios/components/signature-evidence-dialog";
import { Input } from "@/components/ui/input";
import { parseFichaDate } from "@/lib/ficha-date-parse";
import { formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FichaDraftMeta {
  id: string;
  editadoManualmente: boolean;
  editadoPor?: string | null;
  editadoEn?: Date | string | null;
  createdAt: Date | string;
  modelo: string;
}

interface FichaConvenioCardProps {
  ficha: FichaConvenio;
  meta?: FichaDraftMeta;
  editMode?: boolean;
  onEditChange?: (updated: FichaConvenio) => void;
  documentReference?: {
    url: string;
    label: string;
  };
  signatureEvidence?: SignatureEvidence;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UNAVAILABLE_PHRASES = [
  "información no disponible",
  "[dato no disponible",
  "no disponible en el documento",
];

function isUnavailable(v: string) {
  return !v || UNAVAILABLE_PHRASES.some((p) => v.toLowerCase().includes(p));
}

/** ISO date string for `<input type="date">`; tolerates texto legacy español vía parseFichaDate. */
function fechaFirmaToIsoInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = parseFichaDate(t);
  return d ? d.toISOString().slice(0, 10) : "";
}

function formatFichaFirmaReadable(raw: string): string {
  const t = raw.trim();
  if (!t || isUnavailable(t)) return "";
  const d = parseFichaDate(t);
  if (d) return formatDate(d);
  const fallback = sanitizeFichaText(t).trim();
  return fallback || "";
}

function formatDisplayDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── RichText renderer ───────────────────────────────────────────────────────

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletGroup: string[] = [];
  let key = 0;

  function flushBullets() {
    if (!bulletGroup.length) return;
    elements.push(
      <ul key={`ul-${key++}`} className="space-y-1.5 my-2 ml-1">
        {bulletGroup.map((b, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
            <span className="text-blue-500 mt-0.5 shrink-0 select-none">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    );
    bulletGroup = [];
  }

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      flushBullets();
      continue;
    }

    const m = t.match(/^[•\-\*]\s*(.*)/);
    if (m) {
      bulletGroup.push(m[1]);
    } else {
      flushBullets();
      elements.push(
        <p key={`p-${key++}`} className="text-sm text-slate-700 leading-relaxed mb-1">
          {t}
        </p>
      );
    }
  }
  flushBullets();

  return <>{elements}</>;
}

// ─── Section (view) ───────────────────────────────────────────────────────────

function Section({
  title,
  content,
  accent,
  fieldKey,
  editMode,
  onEditChange,
}: {
  title: string;
  content: string;
  accent?: string;
  fieldKey: keyof FichaConvenio;
  editMode?: boolean;
  onEditChange?: (key: keyof FichaConvenio, value: string) => void;
}) {
  const cleanedContent = sanitizeFichaText(content);
  const empty = isUnavailable(cleanedContent);

  return (
    <div className="py-5">
      <h3
        className="text-[11px] font-bold uppercase tracking-widest mb-3"
        style={{ color: accent ?? "#1E293B" }}
      >
        {title}
      </h3>
      {editMode ? (
        <textarea
          value={content}
          onChange={(e) => onEditChange?.(fieldKey, e.target.value)}
          className="w-full min-h-[120px] text-sm text-slate-800 leading-relaxed border border-blue-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-blue-50/30"
          placeholder={`Editar: ${title}`}
        />
      ) : empty ? (
        <p className="text-sm text-slate-400 italic">Información no disponible.</p>
      ) : (
        <RichText text={cleanedContent} />
      )}
    </div>
  );
}

// ─── MetaValue renderer ───────────────────────────────────────────────────────

function MetaValue({ value, editMode, fieldKey, onEditChange, documentReference }: {
  value: string;
  editMode?: boolean;
  fieldKey: keyof FichaConvenio;
  onEditChange?: (key: keyof FichaConvenio, value: string) => void;
  documentReference?: {
    url: string;
    label: string;
  };
}) {
  if (editMode) {
    if (fieldKey === "fechaFirma") {
      const iso = fechaFirmaToIsoInput(value);
      const legacyUnreadable = !!value.trim() && !iso;
      return (
        <div className="space-y-1.5">
          <Input
            type="date"
            value={iso}
            onChange={(e) => onEditChange?.(fieldKey, e.target.value)}
            className="max-w-[260px] border-blue-300 bg-blue-50/30 text-sm focus-visible:ring-blue-500"
          />
          <p className="text-[11px] leading-snug text-slate-500">
            Usa el calendario para guardar la fecha en formato estándar; así se sincroniza bien con el listado.
          </p>
          {legacyUnreadable && (
            <p className="text-[11px] text-amber-700">
              El texto anterior no se reconoció como fecha; elige la fecha correcta arriba.
            </p>
          )}
        </div>
      );
    }

    return (
      <textarea
        value={value}
        rows={value.includes("\n") ? Math.min(value.split("\n").length + 1, 8) : 1}
        onChange={(e) => onEditChange?.(fieldKey, e.target.value)}
        className="w-full text-sm text-slate-800 border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50/30 resize-y"
      />
    );
  }

  if (fieldKey === "fechaFirma") {
    const readable = formatFichaFirmaReadable(value);
    if (!readable) return <span className="text-slate-400 italic">—</span>;
    return <span className="text-sm text-slate-800">{readable}</span>;
  }

  const display =
    fieldKey === "duracion"
      ? normalizeFichaDuracionCell(value)
      : sanitizeFichaText((value ?? "").trim());

  if (fieldKey === "enlace" && documentReference) {
    const hasUsefulValue =
      !!display &&
      display !== "—" &&
      !isUnavailable(display);

    const href = /^https?:\/\//i.test(display) ? display : documentReference.url;
    const label = hasUsefulValue ? display : documentReference.label;

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
        title={label}
      >
        <span className="truncate max-w-[420px]">{label}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    );
  }

  if (!display) return <span className="text-slate-400 italic">—</span>;

  if (display.includes("\n")) {
    const lines = display.split("\n").filter(Boolean);
    return (
      <div className="space-y-0.5">
        {lines.map((line, i) => {
          const t = line.trim();
          return <div key={i} className="text-sm text-slate-800">{t}</div>;
        })}
      </div>
    );
  }
  return <span className="text-sm text-slate-800">{display}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let cls = "bg-gray-100 text-gray-700";
  if (s.includes("vigente")) cls = "bg-emerald-100 text-emerald-800";
  else if (s.includes("vencido") && !s.includes("por")) cls = "bg-red-100 text-red-800";
  else if (s.includes("por vencer")) cls = "bg-amber-100 text-amber-800";
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

// ─── Main Card ────────────────────────────────────────────────────────────────

export function FichaConvenioCard({
  ficha,
  meta,
  editMode = false,
  onEditChange,
  documentReference,
  signatureEvidence,
}: FichaConvenioCardProps) {
  const [localFicha, setLocalFicha] = useState<FichaConvenio>(ficha);

  // Keep local state in sync when parent passes a new ficha (e.g. after regenerate)
  if (!editMode && JSON.stringify(localFicha) !== JSON.stringify(ficha)) {
    setLocalFicha(ficha);
  }

  function handleFieldChange(key: keyof FichaConvenio, value: string) {
    const updated = { ...localFicha, [key]: value };
    setLocalFicha(updated);
    onEditChange?.(updated);
  }

  const displayFicha = editMode ? localFicha : ficha;

  const metaRows: { label: string; key: keyof FichaConvenio; isStatus?: boolean }[] = [
    { label: "Tipo de Instrumento",         key: "tipoInstrumento" },
    { label: "Fecha de Firma",              key: "fechaFirma" },
    { label: "Duración",                    key: "duracion" },
    { label: "Estatus",                     key: "estatus",    isStatus: true },
    { label: "Condición de Terminación",    key: "condicionTerminacion" },
    { label: "Punto Focal",                 key: "puntoFocal" },
    { label: "Direcciones Involucradas",    key: "direccionesInvolucradas" },
    { label: "Enlace / Referencia",         key: "enlace" },
  ];

  const narrativeSections: { title: string; key: keyof FichaConvenio; accent?: string }[] = [
    { title: "Objetivo",                          key: "objetivo" },
    { title: "Modalidades de Cooperación",        key: "modalidadesCooperacion" },
    { title: "Actividades",                       key: "actividades" },
    { title: "Áreas de Cooperación Técnica",      key: "areasCooperacion" },
    { title: "Temas Sugeridos",                   key: "temasSugeridos",        accent: "#3B82F6" },
    { title: "Responsabilidad Financiera",        key: "responsabilidadFinanciera" },
    { title: "Impacto Esperado",                  key: "impactoEsperado",       accent: "#0F766E" },
    { title: "Conclusión",                        key: "conclusion" },
  ];

  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${editMode ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"}`}>

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-medium">
          Nombre del Documento
        </p>
        {editMode ? (
          <textarea
            value={displayFicha.nombreDocumento}
            onChange={(e) => handleFieldChange("nombreDocumento", e.target.value)}
            className="w-full text-base font-semibold leading-snug bg-slate-700 text-white border border-slate-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            rows={2}
          />
        ) : (
          <h2 className="text-base font-semibold text-white leading-snug">
            {displayFicha.nombreDocumento}
          </h2>
        )}

        {/* Meta badges */}
        {meta && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {meta.editadoManualmente ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-200 rounded-full text-[10px] font-medium">
                ✎ Editado manualmente
                {meta.editadoEn && (
                  <span className="opacity-75">· {formatDisplayDate(meta.editadoEn)}</span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 text-blue-200 rounded-full text-[10px] font-medium">
                ⚡ Generado por IA · {formatDisplayDate(meta.createdAt)}
              </span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px] font-mono">
              {meta.modelo}
            </span>
          </div>
        )}
      </div>

      {/* Metadata table */}
      <div className="border-b border-slate-200">
        <table className="w-full text-sm">
          <tbody>
            {metaRows.map(({ label, key, isStatus }, i) => (
              <tr key={key} className={i % 2 === 0 ? "bg-slate-50/70" : "bg-white"}>
                <td className="pl-6 pr-4 py-3 text-slate-500 font-medium w-[250px] align-top text-sm">
                  {label}
                </td>
                <td className="pr-6 py-3 align-top">
                  {isStatus && !editMode ? (
                    <StatusBadge status={displayFicha[key] as string} />
                  ) : key === "fechaFirma" && !editMode ? (
                    <div className="flex items-center gap-2">
                      <MetaValue
                        value={displayFicha[key] as string}
                        fieldKey={key}
                        documentReference={documentReference}
                      />
                      {signatureEvidence && (
                        <SignatureEvidenceDialog evidence={signatureEvidence} />
                      )}
                    </div>
                  ) : (
                    <MetaValue
                      value={displayFicha[key] as string}
                      editMode={editMode}
                      fieldKey={key}
                      onEditChange={handleFieldChange}
                      documentReference={documentReference}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrative sections */}
      <div className="px-6 divide-y divide-slate-100">
        {narrativeSections.map(({ title, key, accent }) => (
          <Section
            key={key}
            title={title}
            content={displayFicha[key] as string}
            accent={accent}
            fieldKey={key}
            editMode={editMode}
            onEditChange={handleFieldChange}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="bg-amber-50 border-t border-amber-200 px-6 py-3">
        <p className="text-xs text-amber-700 text-center">
          Borrador generado automáticamente por IA — Requiere verificación y validación humana
        </p>
      </div>
    </div>
  );
}
