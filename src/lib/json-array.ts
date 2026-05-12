import type { Prisma } from "@prisma/client";

export function jsonToStringArray(v: Prisma.JsonValue | null | undefined): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

export function stringArrayToJson(arr: string[]): Prisma.InputJsonValue {
  return arr as unknown as Prisma.InputJsonValue;
}
