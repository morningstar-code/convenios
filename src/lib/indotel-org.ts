/**
 * Organigrama oficial del INDOTEL (2026) — fuente única de las "direcciones
 * involucradas".
 *
 * La IA NO puede inventar unidades: solo puede elegir de este catálogo. Se usa
 * en dos momentos, y los dos hacen falta:
 *   1. En el prompt, para que el modelo elija de la lista.
 *   2. Al recibir la respuesta, filtrando lo que no esté aquí (`filterDirecciones`).
 * El prompt orienta; el filtro garantiza.
 */

export type UnidadTipo = "autoridad" | "direccion" | "unidad";

export interface UnidadOrganizativa {
  nombre: string;
  tipo: UnidadTipo;
  /** Agrupación del organigrama, para presentar la lista al modelo. */
  area: string;
  /** Siglas oficiales, si las tiene. */
  siglas?: string;
}

export const INDOTEL_ORG: UnidadOrganizativa[] = [
  // ── Autoridades y unidades superiores ──────────────────────────────────
  { nombre: "Consejo Directivo", tipo: "autoridad", area: "Autoridades y unidades superiores" },
  { nombre: "Presidencia del Consejo Directivo", tipo: "autoridad", area: "Autoridades y unidades superiores" },
  { nombre: "Staff del Consejo Directivo", tipo: "autoridad", area: "Autoridades y unidades superiores" },
  { nombre: "Dirección Ejecutiva", tipo: "autoridad", area: "Autoridades y unidades superiores" },
  { nombre: "Oficina o Dirección de Presidencia", tipo: "autoridad", area: "Autoridades y unidades superiores" },
  { nombre: "Oficina de Libre Acceso a la Información Pública — OAI", tipo: "autoridad", area: "Autoridades y unidades superiores", siglas: "OAI" },
  { nombre: "Auditoría Interna", tipo: "autoridad", area: "Autoridades y unidades superiores" },
  { nombre: "Gerencia de Equidad de Género", tipo: "autoridad", area: "Autoridades y unidades superiores" },
  { nombre: "Seguridad Militar", tipo: "autoridad", area: "Autoridades y unidades superiores" },

  // ── Direcciones principales ────────────────────────────────────────────
  { nombre: "Dirección del Fondo de Desarrollo de las Telecomunicaciones — FDT", tipo: "direccion", area: "Direcciones principales", siglas: "FDT" },
  { nombre: "Dirección de Desarrollo de Habilidades Digitales", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Relaciones Internacionales", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección del Espectro Radioeléctrico", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Fiscalización", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Autorizaciones", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Regulación y Defensa de la Competencia", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Cumplimiento y Procesos Sancionadores Administrativos", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Protección al Usuario", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Ciberseguridad, Comercio Electrónico y Firma Digital", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección Financiera", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección Administrativa", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Gestión Humana", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Planificación Estratégica", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Tecnología de la Información y Comunicación", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección Jurídica", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Relaciones Públicas y Comunicaciones", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Protocolo", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de Licitaciones y Contratos Públicos", tipo: "direccion", area: "Direcciones principales" },
  { nombre: "Dirección de la Unidad Ejecutora de Proyectos BID", tipo: "direccion", area: "Direcciones principales" },

  // ── Fondo, proyectos y habilidades digitales ───────────────────────────
  { nombre: "Departamento de Desarrollo y Proyectos", tipo: "unidad", area: "Fondo, proyectos y habilidades digitales" },
  { nombre: "Departamento de Control y Monitoreo de Proyectos", tipo: "unidad", area: "Fondo, proyectos y habilidades digitales" },
  { nombre: "Departamento del Centro INDOTEL", tipo: "unidad", area: "Fondo, proyectos y habilidades digitales" },
  { nombre: "Gerencia de Proyectos", tipo: "unidad", area: "Fondo, proyectos y habilidades digitales" },
  { nombre: "Departamento de Operaciones y Proyectos", tipo: "unidad", area: "Fondo, proyectos y habilidades digitales" },
  { nombre: "Área o Departamento de Análisis, Supervisión y Seguimiento de Datos", tipo: "unidad", area: "Fondo, proyectos y habilidades digitales" },
  { nombre: "Departamento de Desarrollo de Habilidades Digitales", tipo: "unidad", area: "Fondo, proyectos y habilidades digitales" },
  { nombre: "Centro INDOTEL Cultura Digital", tipo: "unidad", area: "Fondo, proyectos y habilidades digitales" },

  // ── Relaciones internacionales e institucionales ───────────────────────
  { nombre: "Departamento de Relaciones Internacionales", tipo: "unidad", area: "Relaciones internacionales e institucionales" },
  { nombre: "Gerencia de Relaciones Institucionales", tipo: "unidad", area: "Relaciones internacionales e institucionales" },
  { nombre: "Departamento de Libre Acceso a la Información Pública", tipo: "unidad", area: "Relaciones internacionales e institucionales" },

  // ── Espectro, fiscalización y autorizaciones ───────────────────────────
  { nombre: "Departamento de Gestión del Espectro Radioeléctrico", tipo: "unidad", area: "Espectro, fiscalización y autorizaciones" },
  { nombre: "Departamento de Monitoreo del Espectro Radioeléctrico", tipo: "unidad", area: "Espectro, fiscalización y autorizaciones" },
  { nombre: "Departamento de Inspección", tipo: "unidad", area: "Espectro, fiscalización y autorizaciones" },
  { nombre: "Departamento de Ingeniería", tipo: "unidad", area: "Espectro, fiscalización y autorizaciones" },
  { nombre: "Departamento de Estadísticas", tipo: "unidad", area: "Espectro, fiscalización y autorizaciones" },
  { nombre: "Departamento Legal de Autorizaciones", tipo: "unidad", area: "Espectro, fiscalización y autorizaciones" },

  // ── Regulación y competencia ───────────────────────────────────────────
  { nombre: "Departamento de Regulación", tipo: "unidad", area: "Regulación y competencia" },
  { nombre: "Departamento de Defensa de la Competencia", tipo: "unidad", area: "Regulación y competencia" },
  { nombre: "Departamento de Análisis Económico", tipo: "unidad", area: "Regulación y competencia" },
  { nombre: "Departamento de Análisis Legal", tipo: "unidad", area: "Regulación y competencia" },

  // ── Protección al usuario ──────────────────────────────────────────────
  { nombre: "Gerencia de Protección y Asistencia al Usuario", tipo: "unidad", area: "Protección al usuario" },
  { nombre: "Departamento de Asistencia al Usuario — DAU", tipo: "unidad", area: "Protección al usuario", siglas: "DAU" },
  { nombre: "Departamento de Tramitación y Conciliación", tipo: "unidad", area: "Protección al usuario" },

  // ── Ciberseguridad y firma digital ─────────────────────────────────────
  { nombre: "Departamento de Ciberseguridad", tipo: "unidad", area: "Ciberseguridad y firma digital" },
  { nombre: "Departamento de Comercio Electrónico", tipo: "unidad", area: "Ciberseguridad y firma digital" },
  { nombre: "Departamento de Firma Digital", tipo: "unidad", area: "Ciberseguridad y firma digital" },
  { nombre: "Departamento Eje de Acceso de República Digital", tipo: "unidad", area: "Ciberseguridad y firma digital" },

  // ── Finanzas ───────────────────────────────────────────────────────────
  { nombre: "Departamento de Contabilidad", tipo: "unidad", area: "Finanzas" },
  { nombre: "Departamento de Presupuesto", tipo: "unidad", area: "Finanzas" },
  { nombre: "Departamento de Recaudaciones", tipo: "unidad", area: "Finanzas" },

  // ── Gestión Humana ─────────────────────────────────────────────────────
  { nombre: "Departamento de Desarrollo del Talento Humano", tipo: "unidad", area: "Gestión Humana" },
  { nombre: "Departamento de Administración del Talento Humano", tipo: "unidad", area: "Gestión Humana" },
  { nombre: "Departamento de Compensación y Beneficios", tipo: "unidad", area: "Gestión Humana" },
  { nombre: "Departamento de Integración y Bienestar", tipo: "unidad", area: "Gestión Humana" },

  // ── Administración y servicios internos ────────────────────────────────
  { nombre: "Departamento de Servicios Generales", tipo: "unidad", area: "Administración y servicios internos" },
  { nombre: "Departamento de Infraestructura", tipo: "unidad", area: "Administración y servicios internos" },
  { nombre: "Departamento de Regularización de Inmuebles", tipo: "unidad", area: "Administración y servicios internos" },
  { nombre: "Departamento de Seguridad Militar", tipo: "unidad", area: "Administración y servicios internos" },
  { nombre: "Departamento de Voluntariado y Responsabilidad Social", tipo: "unidad", area: "Administración y servicios internos" },
  { nombre: "Club Recreativo y Deportivo del INDOTEL", tipo: "unidad", area: "Administración y servicios internos" },
  { nombre: "Almacén V Centenario", tipo: "unidad", area: "Administración y servicios internos" },
  { nombre: "Centro Tetelo Vargas", tipo: "unidad", area: "Administración y servicios internos" },

  // ── Tecnología de la información ───────────────────────────────────────
  { nombre: "Departamento de Redes y Seguridad", tipo: "unidad", area: "Tecnología de la información" },
  { nombre: "Departamento de Servicios y Soporte", tipo: "unidad", area: "Tecnología de la información" },
  { nombre: "Departamento de Sistemas y Bases de Datos", tipo: "unidad", area: "Tecnología de la información" },

  // ── Jurídica, cumplimiento y contratación ──────────────────────────────
  { nombre: "Gerencia de Litigios", tipo: "unidad", area: "Jurídica, cumplimiento y contratación" },
  { nombre: "Departamento de Litigios", tipo: "unidad", area: "Jurídica, cumplimiento y contratación" },
  { nombre: "Gerencia de Contratos y Ejecución", tipo: "unidad", area: "Jurídica, cumplimiento y contratación" },
  { nombre: "Gerencia de Tramitación y Control de Documentación", tipo: "unidad", area: "Jurídica, cumplimiento y contratación" },
  { nombre: "Departamento de Tramitación y Control de Documentos", tipo: "unidad", area: "Jurídica, cumplimiento y contratación" },

  // ── Planificación y calidad ────────────────────────────────────────────
  { nombre: "Gerencia de Fortalecimiento Institucional", tipo: "unidad", area: "Planificación y calidad" },
  { nombre: "Departamento de Planificación y Evaluación de Planes", tipo: "unidad", area: "Planificación y calidad" },
  { nombre: "Departamento de Calidad", tipo: "unidad", area: "Planificación y calidad" },

  // ── Relaciones públicas y comunicaciones ───────────────────────────────
  { nombre: "Gerencia de Relaciones Públicas", tipo: "unidad", area: "Relaciones públicas y comunicaciones" },
  { nombre: "Gerencia de Medios", tipo: "unidad", area: "Relaciones públicas y comunicaciones" },
  { nombre: "Departamento de Prensa", tipo: "unidad", area: "Relaciones públicas y comunicaciones" },
  { nombre: "Departamento de Relaciones Públicas", tipo: "unidad", area: "Relaciones públicas y comunicaciones" },
  { nombre: "Departamento de Eventos", tipo: "unidad", area: "Relaciones públicas y comunicaciones" },
  { nombre: "Departamento de Redes Sociales", tipo: "unidad", area: "Relaciones públicas y comunicaciones" },
];

/** Palabras que no distinguen una unidad de otra. */
const STOPWORDS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "o", "a", "al", "en", "indotel",
]);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentTokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const BY_NORM = new Map<string, UnidadOrganizativa>();
const BY_SIGLAS = new Map<string, UnidadOrganizativa>();

for (const unidad of INDOTEL_ORG) {
  BY_NORM.set(normalize(unidad.nombre), unidad);
  // "Dirección del FDT — FDT" también debe encontrarse sin la sigla al final.
  const sinSiglas = unidad.nombre.split("—")[0].trim();
  if (sinSiglas !== unidad.nombre) BY_NORM.set(normalize(sinSiglas), unidad);
  if (unidad.siglas) BY_SIGLAS.set(normalize(unidad.siglas), unidad);
}

/** Jaccard sobre palabras con contenido. 1 = idénticas. */
function similarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const shared = a.filter((t) => setB.has(t)).length;
  return shared / (new Set([...a, ...b]).size);
}

const MIN_SIMILARITY = 0.6;

/**
 * Devuelve la unidad oficial que corresponde a un texto libre, o null si no
 * hay ninguna razonablemente parecida (es decir: si la IA se la inventó).
 */
export function matchUnidad(value: string): UnidadOrganizativa | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  const key = normalize(raw);
  if (!key) return null;

  const exact = BY_NORM.get(key);
  if (exact) return exact;

  const porSiglas = BY_SIGLAS.get(key);
  if (porSiglas) return porSiglas;

  // "Dirección de Ciberseguridad" → "Dirección de Ciberseguridad, Comercio
  // Electrónico y Firma Digital": el nombre oficial empieza igual.
  const prefijo = INDOTEL_ORG.filter((u) => normalize(u.nombre).startsWith(key + " "));
  if (prefijo.length > 0) {
    return prefijo.sort((a, b) => a.nombre.length - b.nombre.length)[0];
  }

  // Último recurso: parecido por palabras. Ante empate gana la Dirección,
  // porque el campo se llama "direcciones involucradas".
  const tokens = contentTokens(raw);
  let best: { unidad: UnidadOrganizativa; score: number } | null = null;

  for (const unidad of INDOTEL_ORG) {
    const score = similarity(tokens, contentTokens(unidad.nombre));
    if (score < MIN_SIMILARITY) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && unidad.tipo === "direccion" && best.unidad.tipo !== "direccion")
    ) {
      best = { unidad, score };
    }
  }

  return best?.unidad ?? null;
}

/**
 * Deja solo unidades del organigrama, con su nombre oficial y sin repetir.
 * Lo que no reconoce, lo descarta: preferimos una dirección de menos a una
 * inventada.
 */
export function filterDirecciones(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const unidad = matchUnidad(value);
    if (!unidad || seen.has(unidad.nombre)) continue;
    seen.add(unidad.nombre);
    out.push(unidad.nombre);
  }

  return out;
}

/** Igual que filterDirecciones pero sobre el texto con saltos de línea de la ficha. */
export function filterDireccionesText(text: string): string {
  const lines = (text ?? "")
    .split(/[\n;]/)
    .map((l) => l.replace(/^[•\-*\s]+/, "").trim())
    .filter(Boolean);

  const filtered = filterDirecciones(lines);
  return filtered.join("\n");
}

/** Cuáles de estos valores NO existen en el organigrama. Sirve para avisar. */
export function findUnknownDirecciones(values: string[]): string[] {
  return values.filter((v) => v.trim() && !matchUnidad(v));
}

/** El catálogo tal y como se le muestra al modelo dentro del prompt. */
export const INDOTEL_ORG_PROMPT_LIST: string = (() => {
  const porArea = new Map<string, string[]>();
  for (const u of INDOTEL_ORG) {
    const list = porArea.get(u.area) ?? [];
    list.push(u.nombre);
    porArea.set(u.area, list);
  }
  return [...porArea.entries()]
    .map(([area, nombres]) => `## ${area}\n${nombres.map((n) => `- ${n}`).join("\n")}`)
    .join("\n\n");
})();

/** Bloque reutilizable para los prompts que rellenan "direcciones involucradas". */
export const DIRECCIONES_PROMPT_BLOCK = `════════════════════════════════════════
ORGANIGRAMA OFICIAL DEL INDOTEL (2026) — ÚNICA FUENTE VÁLIDA
════════════════════════════════════════
Para el campo de direcciones/unidades involucradas SOLO puedes usar nombres de esta lista, copiados EXACTAMENTE como aparecen aquí.

REGLAS:
- PROHIBIDO inventar, adaptar o traducir nombres de unidades. Si una unidad no está en esta lista, NO EXISTE.
- No inventes variantes: escribe el nombre oficial completo, tal cual.
- Elige las unidades por el objeto del instrumento (áreas de cooperación, actividades, obligaciones).
- Prioriza las "Direcciones principales". Añade departamentos o gerencias solo si el documento los menciona o si su especialidad es claramente el objeto del instrumento.
- La Dirección de Relaciones Internacionales participa en todo instrumento de cooperación internacional: inclúyela siempre.
- Si no tienes base para elegir más, deja solo la que esté claramente vinculada. Menos y correcto es mejor que muchas e inventadas.

${INDOTEL_ORG_PROMPT_LIST}`;
