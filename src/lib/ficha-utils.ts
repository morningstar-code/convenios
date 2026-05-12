import type { FichaConvenio } from "@/lib/openai";

export function sanitizeFichaText(value: string): string {
  return value
    .split("\n")
    .filter((line) => !/^\s*\[Fuente:/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeFichaConvenio(ficha: FichaConvenio): FichaConvenio {
  return Object.fromEntries(
    Object.entries(ficha).map(([key, value]) => [
      key,
      typeof value === "string" ? sanitizeFichaText(value) : value,
    ])
  ) as FichaConvenio;
}
