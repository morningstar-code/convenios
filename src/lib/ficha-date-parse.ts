/**
 * Parses signing dates from IA ficha / user-edited free text into UTC Date (date-only).
 * Accepts ISO, DD/MM/YYYY, and Spanish forms with common variants (missing "de", etc.).
 */

const MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

function normalizeDateText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Recognizes Spanish dates like "10 de mayo de 2017", "10 mayo de 2017", "10 de mayo 2017", "10 de mayo del 2017", "10º mayo de 2017". */
const SPANISH_DATE =
  /(\d{1,2})\s*[.\u00B0]?\s*º?\s*(?:de\s+)?([a-z]+)\s+(?:de(?:l)?\s+)?(\d{4})/;

function stripNoisyUnicode(input: string): string {
  return input
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, "")
    .replace(/[\u00A0\u202F\u2000-\u200A]/g, " ");
}

export function parseFichaDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = stripNoisyUnicode(value)
    .trim()
    .replace(/[.,;:]+$/g, "")
    .trim();
  if (!trimmed || /dato no disponible|informaci[oó]n no disponible/i.test(trimmed))
    return null;

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));

  const norm = normalizeDateText(trimmed);
  const spanish = norm.match(SPANISH_DATE);
  if (spanish) {
    const month = MONTHS[spanish[2]];
    if (month !== undefined) {
      return new Date(Date.UTC(Number(spanish[3]), month, Number(spanish[1])));
    }
  }

  return null;
}
