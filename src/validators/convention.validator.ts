import { z } from "zod";

export const ConventionCreateSchema = z.object({
  codigoInterno: z.string().optional(),
  tipoInstrumento: z.enum([
    "convenio_marco",
    "convenio_especifico",
    "memorando_entendimiento",
    "acuerdo_cooperacion",
    "protocolo",
    "declaracion_conjunta",
    "otro",
  ]),
  contraparte: z.string().min(2, "La contraparte es requerida"),
  pais: z.string().min(2, "El país es requerido"),
  fechaFirma: z.string().optional().nullable(),
  duracionTexto: z.string().optional().nullable(),
  duracionMeses: z.number().int().positive().optional().nullable(),
  renovacionAutomatica: z.boolean().default(false),
  estatus: z.enum(["vigente", "cancelado"]),
  condicionTerminacion: z.string().optional().nullable(),
  diasPreaviso: z.number().int().positive().optional().nullable(),
  puntoFocal: z.string().min(2, "El punto focal es requerido"),
  cargoPuntoFocal: z.string().optional().nullable(),
  correoPuntoFocal: z.string().email().optional().nullable(),
  direccionesInvolucradas: z.array(z.string()).default([]),
  objetivo: z.string().min(10, "El objetivo es requerido"),
  modalidadesCooperacion: z.array(z.string()).default([]),
  areasCooperacion: z.array(z.string()).default([]),
  impactoEsperado: z.string().optional().nullable(),
  responsabilidadFinanciera: z.boolean().default(false),
  montoReferencial: z.number().positive().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  conclusionInterna: z.string().optional().nullable(),
  recomendacionPreliminar: z.string().optional().nullable(),
});

export const ConventionUpdateSchema = ConventionCreateSchema.partial();

export const ConventionFilterSchema = z.object({
  search: z.string().optional(),
  pais: z.string().optional(),
  contraparte: z.string().optional(),
  estatus: z.enum(["vigente", "cancelado"]).optional(),
  tipoInstrumento: z
    .enum([
      "convenio_marco",
      "convenio_especifico",
      "memorando_entendimiento",
      "acuerdo_cooperacion",
      "protocolo",
      "declaracion_conjunta",
      "otro",
    ])
    .optional(),
  porVencer: z.enum(["30", "60", "90"]).optional(),
  /** Año civil (fecha de firma guardada), en UTC como en la app */
  anioFirma: z.number().int().min(1900).max(2200).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  orderBy: z
    .enum(["fechaFirma", "fechaVencimientoCalculada", "createdAt", "contraparte"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type ConventionCreateInput = z.infer<typeof ConventionCreateSchema>;
export type ConventionUpdateInput = z.infer<typeof ConventionUpdateSchema>;
export type ConventionFilter = z.infer<typeof ConventionFilterSchema>;
