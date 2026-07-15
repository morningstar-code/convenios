/**
 * Hoja de Ruta de un MoU — "Propuesta Metodológica de Trabajo".
 *
 * La estructura calca el documento que ya se usa en la institución
 * (Propuesta Hoja de Ruta CRC–INDOTEL): temáticas × avances de cada entidad ×
 * espacio de intercambio × acciones, más coordinación, seguimiento y próximos
 * pasos. Se valida con Zod después de llamar al modelo.
 */

import { z } from "zod";

export const RoadmapAvanceSchema = z.object({
  entidad: z.string(),
  detalle: z.string(),
});

export const RoadmapActividadSchema = z.object({
  tematica: z.string(),
  /** "Alineación: Libro blanco de ciberseguridad Regulatel", o null. */
  alineacion: z.string().nullable(),
  avances: z.array(RoadmapAvanceSchema).default([]),
  /** Mesa de trabajo, Webinar, Panel de expertos, Visita técnica… */
  espacio_tipo: z.string(),
  /** Mes y año en texto: "Junio 2026". */
  espacio_fecha: z.string(),
  acciones: z.string(),
});

export const RoadmapContactoSchema = z.object({
  entidad: z.string(),
  contacto: z.string(),
  cargo: z.string(),
  correo: z.string(),
  telefono: z.string(),
});

export const RoadmapHitoSchema = z.object({
  hito: z.string(),
  fecha: z.string(),
  detalle: z.string(),
});

export const RoadmapSchema = z.object({
  titulo: z.string(),
  parte_propia: z.string(),
  parte_contraparte: z.string(),
  introduccion: z.string(),
  actividades: z.array(RoadmapActividadSchema).default([]),
  coordinacion: z.array(RoadmapContactoSchema).default([]),
  seguimiento: z.array(RoadmapHitoSchema).default([]),
  proximos_pasos: z.array(z.string()).default([]),
});

export type Roadmap = z.infer<typeof RoadmapSchema>;
export type RoadmapActividad = z.infer<typeof RoadmapActividadSchema>;

/** Agrupa las temáticas por espacio de intercambio: el "resumen por fecha". */
export function groupByEspacio(
  actividades: RoadmapActividad[]
): { espacio: string; fecha: string; tematicas: string[] }[] {
  const map = new Map<string, { espacio: string; fecha: string; tematicas: string[] }>();

  for (const a of actividades) {
    if (!a.espacio_tipo?.trim()) continue;
    const key = `${a.espacio_tipo.trim()}|${a.espacio_fecha.trim()}`;
    const entry = map.get(key);
    if (entry) {
      entry.tematicas.push(a.tematica);
    } else {
      map.set(key, {
        espacio: a.espacio_tipo.trim(),
        fecha: a.espacio_fecha.trim(),
        tematicas: [a.tematica],
      });
    }
  }

  return [...map.values()];
}

/** Schema para Structured Outputs. Sin `strict`: validamos con Zod después. */
export const ROADMAP_JSON_SCHEMA = {
  type: "object",
  properties: {
    titulo: { type: "string" },
    parte_propia: { type: "string" },
    parte_contraparte: { type: "string" },
    introduccion: { type: "string" },
    actividades: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tematica: { type: "string" },
          alineacion: { type: ["string", "null"] },
          avances: {
            type: "array",
            items: {
              type: "object",
              properties: {
                entidad: { type: "string" },
                detalle: { type: "string" },
              },
              required: ["entidad", "detalle"],
              additionalProperties: false,
            },
          },
          espacio_tipo: { type: "string" },
          espacio_fecha: { type: "string" },
          acciones: { type: "string" },
        },
        required: [
          "tematica",
          "alineacion",
          "avances",
          "espacio_tipo",
          "espacio_fecha",
          "acciones",
        ],
        additionalProperties: false,
      },
    },
    coordinacion: {
      type: "array",
      items: {
        type: "object",
        properties: {
          entidad: { type: "string" },
          contacto: { type: "string" },
          cargo: { type: "string" },
          correo: { type: "string" },
          telefono: { type: "string" },
        },
        required: ["entidad", "contacto", "cargo", "correo", "telefono"],
        additionalProperties: false,
      },
    },
    seguimiento: {
      type: "array",
      items: {
        type: "object",
        properties: {
          hito: { type: "string" },
          fecha: { type: "string" },
          detalle: { type: "string" },
        },
        required: ["hito", "fecha", "detalle"],
        additionalProperties: false,
      },
    },
    proximos_pasos: { type: "array", items: { type: "string" } },
  },
  required: [
    "titulo",
    "parte_propia",
    "parte_contraparte",
    "introduccion",
    "actividades",
    "coordinacion",
    "seguimiento",
    "proximos_pasos",
  ],
  additionalProperties: false,
} as const;
