/**
 * Generates a compact institutional .docx — targets 1-2 pages.
 * Font: Times New Roman. Tight margins and spacing.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  PageOrientation,
  PageNumber,
  NumberFormat,
  Header,
  Footer,
  convertInchesToTwip,
  TabStopType,
  TabStopPosition,
} from "docx";
import type { FichaConvenio } from "@/lib/openai";
import { normalizeFichaDuracionCell } from "@/lib/utils";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY      = "1A2E4A";
const NAVY_MID  = "2C4A6E";
const GOLD      = "B8860B";
const WHITE     = "FFFFFF";
const LIGHT_ROW = "EEF3FA";
const GRAY_HDR  = "EAEAEA";
const BORDER_C  = "B0BCCB";
const TEXT_BODY = "111111";
const TEXT_MID  = "444444";
const TEXT_SRC  = "888888";
const FONT      = "Times New Roman";

// ─── Compact sizes (half-points) ─────────────────────────────────────────────
const SZ_DOC_TITLE = 24; // 12pt — document title in header bar
const SZ_SECTION   = 20; // 10pt — section headings (bold + navy)
const SZ_BODY      = 18; // 9pt  — body text
const SZ_TABLE     = 17; // 8.5pt— table cells
const SZ_SOURCE    = 15; // 7.5pt— [Fuente:] footnotes
const SZ_FOOTER    = 14; // 7pt  — running footer

// Tight spacing (twips)
const SP_AFTER_TINY = 40;
const SP_AFTER_SM   = 60;
const SP_BEFORE_SEC = 140;
const SP_AFTER_SEC  = 60;
const LINE_SP       = 240; // single spacing

// ─── Helpers ──────────────────────────────────────────────────────────────────

function run(
  text: string,
  opts: { bold?: boolean; italic?: boolean; size?: number; color?: string; underline?: boolean } = {}
) {
  return new TextRun({
    text,
    bold: opts.bold,
    italics: opts.italic,
    size: opts.size ?? SZ_BODY,
    color: opts.color ?? TEXT_BODY,
    font: FONT,
    underline: opts.underline ? {} : undefined,
  });
}

function para(
  children: TextRun[],
  opts: {
    spBefore?: number;
    spAfter?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    indentLeft?: number;
    hanging?: number;
    borderBottom?: boolean;
    borderTop?: boolean;
    shading?: string;
  } = {}
) {
  return new Paragraph({
    children,
    alignment: opts.align,
    spacing: { before: opts.spBefore ?? 0, after: opts.spAfter ?? SP_AFTER_TINY, line: LINE_SP },
    indent: opts.indentLeft
      ? { left: convertInchesToTwip(opts.indentLeft), hanging: opts.hanging ? convertInchesToTwip(opts.hanging) : undefined }
      : undefined,
    border: {
      ...(opts.borderBottom ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD } } : {}),
      ...(opts.borderTop    ? { top:    { style: BorderStyle.SINGLE, size: 2, color: BORDER_C } } : {}),
    },
    shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading, fill: opts.shading } : undefined,
  });
}

/** Renders rich text: bullets, [Fuente:] footnotes, plain paragraphs */
function parseRichText(text: string): Paragraph[] {
  if (!text) return [para([run("—", { italic: true, color: TEXT_MID })])];

  const paras: Paragraph[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (/^\[Fuente:/i.test(line)) {
      paras.push(
        para([run(line, { italic: true, size: SZ_SOURCE, color: TEXT_SRC })], {
          borderTop: true,
          spBefore: 30,
          spAfter: 30,
        })
      );
      continue;
    }

    const bm = line.match(/^[•\-\*]\s*(.*)/);
    if (bm) {
      paras.push(
        para(
          [run(`■  ${bm[1]}`, { size: SZ_BODY })],
          { indentLeft: 0.22, hanging: 0.22, spAfter: 30 }
        )
      );
      continue;
    }

    paras.push(para([run(line, { size: SZ_BODY })], { spAfter: SP_AFTER_SM }));
  }

  return paras.length ? paras : [para([run("—", { italic: true, color: TEXT_MID })])];
}

// ─── Metadata table ───────────────────────────────────────────────────────────

function metaCell(text: string, opts: { bold?: boolean; bg?: string; isSource?: boolean }): TableCell {
  const lines = text.split("\n").filter(Boolean);
  const children = lines.map((raw) => {
    const t = raw.trim();
    const isSrc = /^\[Fuente:/i.test(t);
    return new Paragraph({
      children: [
        run(t, {
          bold: opts.bold && !isSrc,
          italic: isSrc,
          size: isSrc ? SZ_SOURCE : SZ_TABLE,
          color: isSrc ? TEXT_SRC : TEXT_BODY,
        }),
      ],
      spacing: { before: isSrc ? 20 : 30, after: isSrc ? 20 : 30, line: LINE_SP },
      indent: { left: convertInchesToTwip(0.05) },
    });
  });

  return new TableCell({
    children: children.length ? children : [new Paragraph({ children: [run("—", { size: SZ_TABLE })] })],
    shading: opts.bg ? { type: ShadingType.SOLID, color: opts.bg, fill: opts.bg } : undefined,
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 3, color: BORDER_C },
      bottom: { style: BorderStyle.SINGLE, size: 3, color: BORDER_C },
      left:   { style: BorderStyle.SINGLE, size: 3, color: BORDER_C },
      right:  { style: BorderStyle.SINGLE, size: 3, color: BORDER_C },
    },
  });
}

function buildMetaTable(ficha: FichaConvenio): Table {
  const rows: [string, string][] = [
    ["Tipo de Instrumento",      ficha.tipoInstrumento   || "—"],
    ["Fecha de Firma",           ficha.fechaFirma        || "—"],
    ["Duración",                 normalizeFichaDuracionCell(ficha.duracion)],
    ["Estatus",                  ficha.estatus           || "—"],
    ["Condición de Terminación", ficha.condicionTerminacion || "—"],
    ["Punto Focal",              ficha.puntoFocal        || "—"],
    ["Direcciones Involucradas", ficha.direccionesInvolucradas || "—"],
    ["Enlace / Referencia",      ficha.enlace            || "—"],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value], i) =>
      new TableRow({
        children: [
          // Label
          new TableCell({
            width: { size: 27, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: GRAY_HDR, fill: GRAY_HDR },
            borders: {
              top:    { style: BorderStyle.SINGLE, size: 3, color: BORDER_C },
              bottom: { style: BorderStyle.SINGLE, size: 3, color: BORDER_C },
              left:   { style: BorderStyle.SINGLE, size: 3, color: BORDER_C },
              right:  { style: BorderStyle.SINGLE, size: 3, color: BORDER_C },
            },
            children: [
              new Paragraph({
                children: [run(label, { bold: true, size: SZ_TABLE, color: NAVY })],
                spacing: { before: 30, after: 30, line: LINE_SP },
                indent: { left: convertInchesToTwip(0.06) },
              }),
            ],
          }),
          // Value
          metaCell(value, { bg: i % 2 === 0 ? WHITE : LIGHT_ROW }),
        ],
      })
    ),
  });
}

// ─── Section block ────────────────────────────────────────────────────────────

function sectionBlock(title: string, content: string): Paragraph[] {
  return [
    para(
      [run(title, { bold: true, size: SZ_SECTION, color: NAVY })],
      { spBefore: SP_BEFORE_SEC, spAfter: SP_AFTER_SEC, borderBottom: true }
    ),
    ...parseRichText(content),
  ];
}

// ─── Header / Footer ─────────────────────────────────────────────────────────

function buildHeader(title: string): Header {
  return new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          run("INDOTEL — Dirección de Relaciones Internacionales", {
            bold: true,
            size: SZ_FOOTER,
            color: NAVY,
          }),
          run("\t", { size: SZ_FOOTER }),
          run("Resumen Ejecutivo de Convenio Internacional", {
            italic: true,
            size: SZ_FOOTER,
            color: TEXT_MID,
          }),
        ],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD } },
        spacing: { after: 40 },
      }),
    ],
  });
}

function buildFooter(fecha?: string): Footer {
  return new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          run(fecha ? `Generado: ${fecha}` : "Borrador — requiere validación", {
            italic: true,
            size: SZ_FOOTER,
            color: TEXT_SRC,
          }),
          run("\t", { size: SZ_FOOTER }),
          run("p. ", { size: SZ_FOOTER, color: TEXT_MID }),
          new TextRun({ children: [PageNumber.CURRENT], size: SZ_FOOTER, color: TEXT_MID, font: FONT }),
          run(" / ", { size: SZ_FOOTER, color: TEXT_MID }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: SZ_FOOTER, color: TEXT_MID, font: FONT }),
        ],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD } },
        spacing: { before: 40 },
      }),
    ],
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function fichaToDocx(
  ficha: FichaConvenio,
  meta?: { generadoPor?: string; fechaGeneracion?: string; editadoManualmente?: boolean }
): Promise<Buffer> {
  const doc = new Document({
    numbering: { config: [] },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SZ_BODY, color: TEXT_BODY },
          paragraph: { spacing: { line: LINE_SP, after: SP_AFTER_TINY } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.65),
              left:   convertInchesToTwip(0.75),
              right:  convertInchesToTwip(0.7),
              header: convertInchesToTwip(0.3),
              footer: convertInchesToTwip(0.3),
            },
            size: { orientation: PageOrientation.PORTRAIT },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: { default: buildHeader(ficha.nombreDocumento) },
        footers: { default: buildFooter(meta?.fechaGeneracion) },
        children: [
          // ── Document title ───────────────────────────────────────────────
          para(
            [run(ficha.nombreDocumento, { bold: true, size: SZ_DOC_TITLE, color: NAVY })],
            {
              spBefore: 60,
              spAfter:  80,
              borderBottom: true,
            }
          ),

          // Status + type + date line
          para([
            run("Tipo: ",        { bold: true, size: SZ_TABLE, color: TEXT_MID }),
            run(`${ficha.tipoInstrumento || "—"}   `, { size: SZ_TABLE }),
            run("Firma: ",       { bold: true, size: SZ_TABLE, color: TEXT_MID }),
            run(`${ficha.fechaFirma || "—"}   `,      { size: SZ_TABLE }),
            run("Estatus: ",     { bold: true, size: SZ_TABLE, color: TEXT_MID }),
            run(ficha.estatus || "—",                  { size: SZ_TABLE }),
          ], { spAfter: 80 }),

          // ── Metadata table ───────────────────────────────────────────────
          buildMetaTable(ficha),

          // ── Narrative sections ───────────────────────────────────────────
          ...sectionBlock("Objetivo",                     ficha.objetivo),
          ...sectionBlock("Modalidades de Cooperación",   ficha.modalidadesCooperacion),
          ...sectionBlock("Actividades",                  ficha.actividades),
          ...sectionBlock("Áreas de Cooperación Técnica", ficha.areasCooperacion),
          ...sectionBlock("Temas Sugeridos",              ficha.temasSugeridos),
          ...sectionBlock("Responsabilidad Financiera",   ficha.responsabilidadFinanciera),
          ...sectionBlock("Impacto Esperado",             ficha.impactoEsperado),
          ...sectionBlock("Conclusión",                   ficha.conclusion),

          // ── Disclaimer ───────────────────────────────────────────────────
          para(
            [
              run(
                meta?.editadoManualmente
                  ? "Documento editado manualmente — "
                  : "Borrador generado por IA — ",
                { bold: true, size: SZ_SOURCE, color: NAVY_MID }
              ),
              run(
                "Requiere verificación y validación humana antes de ser considerado documento oficial.",
                { italic: true, size: SZ_SOURCE, color: TEXT_MID }
              ),
            ],
            { spBefore: 120, spAfter: 40, shading: "F0F4F8" }
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
