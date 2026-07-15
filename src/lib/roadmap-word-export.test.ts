import { describe, expect, it } from "vitest";
import { roadmapToDocx } from "@/lib/roadmap-word-export";
import { RoadmapSchema, type Roadmap } from "@/validators/roadmap.schema";

/** Hoja de ruta real (Propuesta CRC–INDOTEL) recortada a lo esencial. */
const CRC_INDOTEL: Roadmap = {
  titulo: "Propuesta Metodológica de Trabajo",
  parte_propia: "INDOTEL (República Dominicana)",
  parte_contraparte: "CRC (Colombia)",
  introduccion:
    "Las temáticas identificadas de interés común entre la CRC e INDOTEL se muestran a continuación.",
  actividades: [
    {
      tematica: "Ciberseguridad para el Sector TIC",
      alineacion: "Alineación: Libro blanco de ciberseguridad Regulatel",
      avances: [
        { entidad: "INDOTEL", detalle: "Cuenta con el programa Click Seguro 360." },
        { entidad: "CRC", detalle: "Cuenta con estudio de ciberseguridad sectorial." },
      ],
      espacio_tipo: "Mesa de trabajo",
      espacio_fecha: "Junio 2026",
      acciones: "CRC presenta su estudio de ciberseguridad y marcos de gobernanza.",
    },
    {
      tematica: "Calidad del Servicio y Herramientas de Medición",
      alineacion: null,
      avances: [],
      espacio_tipo: "Webinar",
      espacio_fecha: "Agosto 2026",
      acciones: "CRC presenta su marco de QoS y plataforma Postdata.",
    },
  ],
  coordinacion: [
    {
      entidad: "CRC – Colombia",
      contacto: "Mariana Sarmiento Argüello",
      cargo: "Coordinadora de Relacionamiento con Agentes",
      correo: "mariana.sarmiento@crcom.gov.co",
      telefono: "+57 (601) 3198300 Ext 8335",
    },
    {
      entidad: "INDOTEL – República Dominicana",
      contacto: "Por designar",
      cargo: "—",
      correo: "—",
      telefono: "—",
    },
  ],
  seguimiento: [
    {
      hito: "Reunión de inicio",
      fecha: "junio de 2026",
      detalle: "Videoconferencia para confirmar el cronograma y designar equipos.",
    },
  ],
  proximos_pasos: ["Remitir la presente propuesta a INDOTEL para su validación formal."],
};

/** Un .docx es un zip: empieza por "PK". */
function isDocx(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

describe("roadmapToDocx", () => {
  it("genera un .docx válido con la hoja de ruta CRC–INDOTEL", async () => {
    const buffer = await roadmapToDocx(CRC_INDOTEL, { fechaGeneracion: "15/07/2026" });
    expect(isDocx(buffer)).toBe(true);
    // Un documento con dos tablas y varias secciones no baja de unos pocos KB.
    expect(buffer.length).toBeGreaterThan(4_000);
  });

  it("no se rompe con una hoja de ruta vacía", async () => {
    const empty = RoadmapSchema.parse({
      titulo: "Propuesta Metodológica de Trabajo",
      parte_propia: "INDOTEL",
      parte_contraparte: "Contraparte",
      introduccion: "Sin actividades definidas todavía.",
      actividades: [],
      coordinacion: [],
      seguimiento: [],
      proximos_pasos: [],
    });

    const buffer = await roadmapToDocx(empty);
    expect(isDocx(buffer)).toBe(true);
  });

  it("tolera una actividad sin avances ni alineación", async () => {
    const buffer = await roadmapToDocx({
      ...CRC_INDOTEL,
      actividades: [
        {
          tematica: "Temática a sugerir por INDOTEL",
          alineacion: null,
          avances: [],
          espacio_tipo: "Videoconferencia",
          espacio_fecha: "Marzo 2027",
          acciones: "Por definir.",
        },
      ],
    });
    expect(isDocx(buffer)).toBe(true);
  });
});
