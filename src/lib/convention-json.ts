import type { Prisma } from "@prisma/client";
import { jsonToStringArray } from "@/lib/json-array";

type WithJsonArrays = {
  direccionesInvolucradas: Prisma.JsonValue;
  modalidadesCooperacion: Prisma.JsonValue;
  areasCooperacion: Prisma.JsonValue;
};

/** Convierte campos Json (lista) al tipo string[] que usa la UI. */
export function normalizeConventionArrays<T extends WithJsonArrays>(c: T) {
  return {
    ...c,
    direccionesInvolucradas: jsonToStringArray(c.direccionesInvolucradas),
    modalidadesCooperacion: jsonToStringArray(c.modalidadesCooperacion),
    areasCooperacion: jsonToStringArray(c.areasCooperacion),
  };
}
