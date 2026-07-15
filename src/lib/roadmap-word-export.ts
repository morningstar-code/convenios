/**
 * Exporta la Hoja de Ruta a .docx replicando la estructura del documento que
 * ya usa la institución (Propuesta Hoja de Ruta CRC–INDOTEL): tabla de
 * actividades, resumen por espacio y fecha, coordinación, seguimiento y
 * próximos pasos. Mismos tokens visuales que la ficha (`word-export.ts`).
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
import { groupByEspacio, type Roadmap } from "@/validators/roadmap.schema";

const NAVY = "1A2E4A";
const GOLD = "B8860B";
const WHITE = "FFFFFF";
const LIGHT_ROW = "EEF3FA";
const GRAY_HDR = "EAEAEA";
const BORDER_C = "B0BCCB";
const TEXT_BODY = "111111";
const TEXT_MID = "444444";
const TEXT_SRC = "888888";
const FONT = "Times New Roman";

const SZ_DOC_TITLE = 26;
const SZ_SUBTITLE = 20;
const SZ_SECTION = 20;
const SZ_BODY = 18;
const SZ_TABLE = 16;
const SZ_FOOTER = 14;

const LINE_SP = 240;

function run(
  text: string,
  opts: { bold?: boolean; italic?: boolean; size?: number; color?: string } = {}
) {
  return new TextRun({
    text,
    bold: opts.bold,
    italics: opts.italic,
    size: opts.size ?? SZ_BODY,
    color: opts.color ?? TEXT_BODY,
    font: FONT,
  });
}

function para(
  children: TextRun[],
  opts: {
    spBefore?: number;
    spAfter?: number;
    align?: "center" | "left";
    borderBottom?: boolean;
    indentLeft?: number;
    hanging?: number;
  } = {}
) {
  return new Paragraph({
    children,
    alignment: opts.align === "center" ? "center" : undefined,
    spacing: { before: opts.spBefore ?? 0, after: opts.spAfter ?? 60, line: LINE_SP },
    indent: opts.indentLeft
      ? {
          left: convertInchesToTwip(opts.indentLeft),
          hanging: opts.hanging ? convertInchesToTwip(opts.hanging) : undefined,
        }
      : undefined,
    border: opts.borderBottom
      ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD } }
      : undefined,
  });
}

function sectionTitle(text: string): Paragraph {
  return para([run(text, { bold: true, size: SZ_SECTION, color: NAVY })], {
    spBefore: 180,
    spAfter: 80,
    borderBottom: true,
  });
}

const CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 3, color: BORDER_C },
  bottom: { style: BorderStyle.SINGLE, size: 3, color: BORDER_C },
  left: { style: BorderStyle.SINGLE, size: 3, color: BORDER_C },
  right: { style: BorderStyle.SINGLE, size: 3, color: BORDER_C },
} as const;

function headerCell(text: string, widthPct: number): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.SOLID, color: GRAY_HDR, fill: GRAY_HDR },
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        children: [run(text.toUpperCase(), { bold: true, size: SZ_TABLE, color: NAVY })],
        spacing: { before: 40, after: 40, line: LINE_SP },
        indent: { left: convertInchesToTwip(0.05) },
      }),
    ],
  });
}

/** Celda de texto; cada línea del string es un párrafo, y "• " se respeta. */
function bodyCell(lines: string[], opts: { bg?: string } = {}): TableCell {
  const children = lines.filter(Boolean).map((line) =>
    new Paragraph({
      children: [run(line, { size: SZ_TABLE })],
      spacing: { before: 30, after: 30, line: LINE_SP },
      indent: { left: convertInchesToTwip(0.05) },
    })
  );

  return new TableCell({
    shading: opts.bg ? { type: ShadingType.SOLID, color: opts.bg, fill: opts.bg } : undefined,
    borders: CELL_BORDERS,
    children: children.length
      ? children
      : [new Paragraph({ children: [run("—", { size: SZ_TABLE, color: TEXT_MID })] })],
  });
}

function buildActividadesTable(roadmap: Roadmap): Table {
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Temática", 22),
        headerCell("Avances de cada entidad", 28),
        headerCell("Espacio de intercambio", 18),
        headerCell("Acciones / propuesta", 32),
      ],
    }),
  ];

  roadmap.actividades.forEach((a, i) => {
    const bg = i % 2 === 0 ? WHITE : LIGHT_ROW;
    rows.push(
      new TableRow({
        children: [
          bodyCell([a.tematica, a.alineacion ?? ""].filter(Boolean), { bg }),
          bodyCell(
            a.avances.map((av) => `${av.entidad}: ${av.detalle}`),
            { bg }
          ),
          bodyCell([a.espacio_tipo, a.espacio_fecha], { bg }),
          bodyCell([a.acciones], { bg }),
        ],
      })
    );
  });

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function buildResumenTable(roadmap: Roadmap): Table {
  const grouped = groupByEspacio(roadmap.actividades);

  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [headerCell("Espacio / momento", 40), headerCell("Temáticas asociadas", 60)],
    }),
  ];

  grouped.forEach((g, i) => {
    const bg = i % 2 === 0 ? WHITE : LIGHT_ROW;
    rows.push(
      new TableRow({
        children: [
          bodyCell([`${g.espacio} — ${g.fecha}`], { bg }),
          bodyCell(g.tematicas, { bg }),
        ],
      })
    );
  });

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function buildCoordinacionTable(roadmap: Roadmap): Table {
  const partes = roadmap.coordinacion;

  const header = new TableRow({
    tableHeader: true,
    children: [
      headerCell("", 22),
      ...partes.map((p) => headerCell(p.entidad, Math.floor(78 / Math.max(partes.length, 1)))),
    ],
  });

  const field = (label: string, pick: (p: (typeof partes)[number]) => string, i: number) =>
    new TableRow({
      children: [
        headerCell(label, 22),
        ...partes.map((p) => bodyCell([pick(p)], { bg: i % 2 === 0 ? WHITE : LIGHT_ROW })),
      ],
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      header,
      field("Contacto", (p) => p.contacto, 0),
      field("Cargo", (p) => p.cargo, 1),
      field("Correo", (p) => p.correo, 2),
      field("Teléfono", (p) => p.telefono, 3),
    ],
  });
}

function buildHeader(): Header {
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
          run("Propuesta Metodológica de Trabajo", {
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

export async function roadmapToDocx(
  roadmap: Roadmap,
  meta?: { fechaGeneracion?: string }
): Promise<Buffer> {
  const doc = new Document({
    numbering: { config: [] },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SZ_BODY, color: TEXT_BODY },
          paragraph: { spacing: { line: LINE_SP, after: 60 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.65),
              left: convertInchesToTwip(0.7),
              right: convertInchesToTwip(0.7),
              header: convertInchesToTwip(0.3),
              footer: convertInchesToTwip(0.3),
            },
            size: { orientation: PageOrientation.LANDSCAPE },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: { default: buildHeader() },
        footers: { default: buildFooter(meta?.fechaGeneracion) },
        children: [
          para([run(roadmap.titulo.toUpperCase(), { bold: true, size: SZ_DOC_TITLE, color: NAVY })], {
            align: "center",
            spAfter: 40,
          }),
          para(
            [
              run(`${roadmap.parte_propia}  ·  ${roadmap.parte_contraparte}`, {
                size: SZ_SUBTITLE,
                color: TEXT_MID,
              }),
            ],
            { align: "center", spAfter: 140, borderBottom: true }
          ),

          para([run(roadmap.introduccion, { size: SZ_BODY })], { spAfter: 140 }),

          sectionTitle("Propuesta de actividades de cooperación técnica"),
          buildActividadesTable(roadmap),

          sectionTitle("Resumen por espacio de intercambio y fecha"),
          buildResumenTable(roadmap),

          sectionTitle("Coordinación"),
          para(
            [
              run("Conforme al Anexo I del instrumento, los puntos de contacto designados son:", {
                size: SZ_BODY,
              }),
            ],
            { spAfter: 80 }
          ),
          buildCoordinacionTable(roadmap),

          sectionTitle("Seguimiento"),
          para(
            [run("Para la realización del seguimiento se establece la siguiente metodología:", { size: SZ_BODY })],
            { spAfter: 80 }
          ),
          ...roadmap.seguimiento.map((h) =>
            para(
              [
                run(`■  ${h.hito} — ${h.fecha}. `, { bold: true, size: SZ_BODY }),
                run(h.detalle, { size: SZ_BODY }),
              ],
              { indentLeft: 0.22, hanging: 0.22, spAfter: 50 }
            )
          ),

          sectionTitle("Próximos pasos"),
          ...roadmap.proximos_pasos.map((p, i) =>
            para([run(`${i + 1}.  ${p}`, { size: SZ_BODY })], {
              indentLeft: 0.24,
              hanging: 0.24,
              spAfter: 50,
            })
          ),

          para(
            [
              run("Borrador generado por IA — ", { bold: true, size: 15, color: NAVY }),
              run(
                "Requiere verificación y validación humana antes de ser remitido a la contraparte.",
                { italic: true, size: 15, color: TEXT_MID }
              ),
            ],
            { spBefore: 200 }
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
