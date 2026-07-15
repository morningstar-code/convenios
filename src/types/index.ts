export type Role = "admin" | "viewer";

export type ConventionStatus = "vigente" | "cancelado";

export type InstrumentType =
  | "convenio_marco"
  | "convenio_especifico"
  | "memorando_entendimiento"
  | "acuerdo_cooperacion"
  | "protocolo"
  | "declaracion_conjunta"
  | "otro";

export type AlertType =
  | "vencimiento_30"
  | "vencimiento_60"
  | "vencimiento_90"
  | "vencido"
  | "revision_manual"
  | "sin_validar"
  | "documento_sin_procesar";

export type AlertSeverity = "info" | "warning" | "critical";

export type DraftType =
  | "ficha_tecnica"
  | "resumen_ejecutivo"
  | "recomendacion_preliminar";

/** Sub-secciones de "4 · Seguimiento". La primera es la que se abre por defecto. */
export const SEGUIMIENTO_TABS = ["resumen", "hoja-de-ruta", "alertas"] as const;

export type SeguimientoTab = (typeof SEGUIMIENTO_TABS)[number];

export const SEGUIMIENTO_TAB_LABELS: Record<SeguimientoTab, string> = {
  resumen: "Resumen ejecutivo con IA",
  "hoja-de-ruta": "Hoja de Ruta",
  alertas: "Alertas",
};

export function parseSeguimientoTab(value: string | undefined | null): SeguimientoTab {
  return SEGUIMIENTO_TABS.includes(value as SeguimientoTab)
    ? (value as SeguimientoTab)
    : SEGUIMIENTO_TABS[0];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface ConventionListItem {
  id: string;
  codigoInterno?: string | null;
  tipoInstrumento: InstrumentType;
  contraparte: string;
  pais: string;
  fechaFirma?: Date | null;
  fechaVencimientoCalculada?: Date | null;
  estatus: ConventionStatus;
  validado: boolean;
  puntoFocal: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    documents: number;
    alerts: number;
  };
}

export interface DashboardStats {
  total: number;
  vigentes: number;
  porVencer30: number;
  porVencer60: number;
  porVencer90: number;
  vencidos: number;
  pendientesValidacion: number;
}

export const INSTRUMENT_TYPE_LABELS: Record<InstrumentType, string> = {
  convenio_marco: "Acuerdo Marco",
  convenio_especifico: "Acuerdo Específico",
  memorando_entendimiento: "Memorando de Entendimiento",
  acuerdo_cooperacion: "Acuerdo de Cooperación",
  protocolo: "Protocolo",
  declaracion_conjunta: "Declaración Conjunta",
  otro: "Otro",
};

export const STATUS_LABELS: Record<ConventionStatus, string> = {
  vigente: "Vigente",
  cancelado: "Cancelado",
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  vencimiento_30: "Vence en 30 días",
  vencimiento_60: "Vence en 60 días",
  vencimiento_90: "Vence en 90 días",
  vencido: "Vencido",
  revision_manual: "Revisión Manual",
  sin_validar: "Sin Validar",
  documento_sin_procesar: "Documento Sin Procesar",
};

export const DRAFT_TYPE_LABELS: Record<DraftType, string> = {
  ficha_tecnica: "Resumen Ejecutivo",
  resumen_ejecutivo: "Resumen Ejecutivo",
  recomendacion_preliminar: "Recomendación Preliminar",
};
