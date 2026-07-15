import { CheckCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatConvenioDuracionDisplay, formatDate } from "@/lib/utils";
import { INSTRUMENT_TYPE_LABELS } from "@/types";
import type { ConventionStatus, InstrumentType } from "@/types";

/**
 * Una ficha en formato hoja, pensada para imprimirse y archivarse en la carpeta
 * física. Se usa en "todas las fichas": cada una arranca en una página nueva.
 */

export interface FichaSheetConvention {
  id: string;
  contraparte: string;
  pais: string;
  codigoInterno?: string | null;
  tipoInstrumento: string;
  estatus: string;
  validado: boolean;
  fechaFirma?: Date | string | null;
  fechaVencimientoCalculada?: Date | string | null;
  duracionTexto?: string | null;
  duracionMeses?: number | null;
  renovacionAutomatica?: boolean;
  diasPreaviso?: number | null;
  condicionTerminacion?: string | null;
  responsabilidadFinanciera?: boolean;
  puntoFocal: string;
  cargoPuntoFocal?: string | null;
  correoPuntoFocal?: string | null;
  direccionesInvolucradas: string[];
  objetivo: string;
  areasCooperacion: string[];
  modalidadesCooperacion: string[];
  impactoEsperado?: string | null;
}

export function FichaPrintSheet({
  convention,
  index,
  total,
}: {
  convention: FichaSheetConvention;
  index?: number;
  total?: number;
}) {
  return (
    <article className="break-after-page rounded-xl border border-slate-200 bg-white p-6 print:break-inside-avoid print:rounded-none print:border-0 print:p-0 print:shadow-none">
      {/* Cabecera */}
      <header className="mb-4 border-b border-slate-200 pb-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={convention.estatus as ConventionStatus} />
          {convention.validado && (
            <Badge variant="success">
              <CheckCircle className="mr-1 h-3 w-3" />
              Validado
            </Badge>
          )}
          {convention.codigoInterno && (
            <span className="font-mono text-xs text-slate-500">{convention.codigoInterno}</span>
          )}
          {index != null && total != null && (
            <span className="ml-auto text-xs text-slate-400">
              Ficha {index} de {total}
            </span>
          )}
        </div>
        <h2 className="text-lg font-bold text-slate-900">{convention.contraparte}</h2>
        <p className="text-sm text-slate-500">
          {convention.pais}
          <span className="mx-1.5 text-slate-300">·</span>
          {INSTRUMENT_TYPE_LABELS[convention.tipoInstrumento as InstrumentType]}
        </p>
      </header>

      {/* Tabla identificatoria */}
      <table className="w-full border-collapse text-sm">
        <tbody>
          <Row label="Tipo de instrumento">
            {INSTRUMENT_TYPE_LABELS[convention.tipoInstrumento as InstrumentType]}
          </Row>
          <Row label="Fecha de firma">{formatDate(convention.fechaFirma)}</Row>
          <Row label="Duración">
            {formatConvenioDuracionDisplay(convention.duracionTexto, convention.duracionMeses)}
          </Row>
          <Row label="Vencimiento">
            {convention.fechaVencimientoCalculada
              ? formatDate(convention.fechaVencimientoCalculada)
              : "Indefinida"}
          </Row>
          <Row label="Renovación">
            {convention.renovacionAutomatica ? "Automática" : "No automática"}
          </Row>
          {convention.diasPreaviso ? (
            <Row label="Preaviso">{convention.diasPreaviso} días</Row>
          ) : null}
          {convention.condicionTerminacion ? (
            <Row label="Condición de terminación">{convention.condicionTerminacion}</Row>
          ) : null}
          <Row label="Responsabilidad financiera">
            {convention.responsabilidadFinanciera
              ? "Sí"
              : "No genera obligaciones económicas"}
          </Row>
          <Row label="Punto focal">
            {[convention.puntoFocal, convention.cargoPuntoFocal].filter(Boolean).join(", ")}
            {convention.correoPuntoFocal ? ` (${convention.correoPuntoFocal})` : ""}
          </Row>
          <Row label="Direcciones involucradas">
            {convention.direccionesInvolucradas.length > 0 ? (
              <ul className="space-y-0.5">
                {convention.direccionesInvolucradas.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </Row>
        </tbody>
      </table>

      {/* Narrativa */}
      <section className="mt-4 space-y-3">
        <Block title="Objetivo">{convention.objetivo}</Block>
        {convention.areasCooperacion.length > 0 && (
          <Block title="Áreas de cooperación">
            {convention.areasCooperacion.join(" · ")}
          </Block>
        )}
        {convention.modalidadesCooperacion.length > 0 && (
          <Block title="Modalidades de cooperación">
            {convention.modalidadesCooperacion.join(" · ")}
          </Block>
        )}
        {convention.impactoEsperado && (
          <Block title="Impacto esperado">{convention.impactoEsperado}</Block>
        )}
      </section>

      {!convention.validado && (
        <p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-xs text-amber-700">
          <Sparkles className="h-3 w-3" />
          Ficha sin validar: los datos provienen de la extracción automática y aún no los ha
          revisado una persona.
        </p>
      )}
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-slate-100 align-top">
      <th className="w-52 border-r border-slate-100 bg-slate-50 px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 print:bg-transparent">
        {label}
      </th>
      <td className="px-3 py-1.5 text-slate-800">{children}</td>
    </tr>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-slate-700">{children}</p>
    </div>
  );
}
