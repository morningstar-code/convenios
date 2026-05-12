import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInDays, addMonths, isPast } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";

  // Prisma stores date-only fields at UTC midnight; format them in UTC to avoid
  // showing the previous day in UTC-4 local time.
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy HH:mm", { locale: es });
}

export function calculateExpirationDate(
  startDate: Date,
  durationMonths: number
): Date {
  return addMonths(startDate, durationMonths);
}

export function getDaysUntilExpiration(
  expirationDate: Date | null | undefined
): number | null {
  if (!expirationDate) return null;
  return differenceInDays(expirationDate, new Date());
}

export function isExpired(date: Date | null | undefined): boolean {
  if (!date) return false;
  return isPast(date);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function generateInternalCode(prefix: string = "CONV"): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${year}-${random}`;
}

/** Ficha / UI: duración por defecto cuando no hay dato claro del documento. */
export function normalizeFichaDuracionCell(value: string | null | undefined): string {
  const t = (value ?? "").trim();
  if (!t || t === "—" || t === "-") return "Indefinida";
  const low = t.toLowerCase();
  const unavailable = [
    "información no disponible",
    "[dato no disponible",
    "no disponible en el documento",
    "dato no disponible en el documento",
  ];
  if (unavailable.some((p) => low.includes(p))) return "Indefinida";
  return t;
}

/** Vista convenio: prioriza texto extraído, luego meses numéricos, sino Indefinida. */
export function formatConvenioDuracionDisplay(
  duracionTexto: string | null | undefined,
  duracionMeses: number | null | undefined
): string {
  const text = duracionTexto?.trim();
  if (text) return text;
  if (duracionMeses != null && duracionMeses > 0) return `${duracionMeses} meses`;
  return "Indefinida";
}
