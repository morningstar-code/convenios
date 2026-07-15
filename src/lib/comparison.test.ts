import { describe, expect, it } from "vitest";
import {
  buildComparison,
  findOverlappingAreas,
  type ComparableConvention,
} from "@/lib/comparison";

function conv(over: Partial<ComparableConvention> = {}): ComparableConvention {
  return {
    id: "1",
    contraparte: "CRC",
    pais: "Colombia",
    tipoInstrumento: "memorando_entendimiento",
    estatus: "vigente",
    validado: true,
    duracionTexto: "3 años",
    duracionMeses: 36,
    renovacionAutomatica: true,
    diasPreaviso: 90,
    responsabilidadFinanciera: false,
    puntoFocal: "Mariana Sarmiento",
    areasCooperacion: ["Ciberseguridad", "Calidad del servicio"],
    modalidadesCooperacion: ["Mesas de trabajo"],
    ...over,
  };
}

function row(rows: ReturnType<typeof buildComparison>, key: string) {
  const found = rows.find((r) => r.key === key);
  if (!found) throw new Error(`fila ${key} no encontrada`);
  return found;
}

describe("buildComparison", () => {
  it("no marca diferencias cuando los instrumentos coinciden", () => {
    const rows = buildComparison([conv({ id: "a" }), conv({ id: "b" })]);
    expect(rows.every((r) => r.cells.every((c) => !c.differs))).toBe(true);
  });

  it("marca respecto del primero, que es la referencia", () => {
    const rows = buildComparison([
      conv({ id: "a", duracionTexto: "3 años" }),
      conv({ id: "b", duracionTexto: "2 años" }),
    ]);
    const duracion = row(rows, "duracion");
    expect(duracion.cells[0].differs).toBe(false);
    expect(duracion.cells[1].differs).toBe(true);
  });

  it("marca la minoría aunque la mayoría difiera de la referencia", () => {
    // 2 y 3 comparten valor, pero la referencia es el primero: ambos se apartan.
    const rows = buildComparison([
      conv({ id: "a", diasPreaviso: 90 }),
      conv({ id: "b", diasPreaviso: 60 }),
      conv({ id: "c", diasPreaviso: 60 }),
    ]);
    const preaviso = row(rows, "preaviso");
    expect(preaviso.cells.map((c) => c.differs)).toEqual([false, true, true]);
  });

  it("no marca las fechas de firma: que difieran no significa nada", () => {
    const rows = buildComparison([
      conv({ id: "a", fechaFirma: new Date("2026-05-14") }),
      conv({ id: "b", fechaFirma: new Date("2024-11-18") }),
    ]);
    expect(row(rows, "firma").cells.every((c) => !c.differs)).toBe(true);
  });

  it("compara las áreas sin importar el orden en que estén guardadas", () => {
    const rows = buildComparison([
      conv({ id: "a", areasCooperacion: ["Ciberseguridad", "Calidad"] }),
      conv({ id: "b", areasCooperacion: ["Calidad", "Ciberseguridad"] }),
    ]);
    expect(row(rows, "areas").cells[1].differs).toBe(false);
  });

  it("distingue tener hoja de ruta de no tenerla", () => {
    const rows = buildComparison([
      conv({ id: "a", tieneHojaDeRuta: true }),
      conv({ id: "b", tieneHojaDeRuta: false }),
    ]);
    const hoja = row(rows, "hoja");
    expect(hoja.cells[0].text).toBe("Generada");
    expect(hoja.cells[1].text).toBe("Sin generar");
    expect(hoja.cells[1].differs).toBe(true);
  });

  it("devuelve vacío sin instrumentos", () => {
    expect(buildComparison([])).toEqual([]);
  });
});

describe("findOverlappingAreas", () => {
  it("encuentra las áreas presentes en más de un instrumento", () => {
    const overlap = findOverlappingAreas([
      conv({ id: "a", areasCooperacion: ["Ciberseguridad", "Calidad del servicio"] }),
      conv({ id: "b", areasCooperacion: ["Calidad del servicio", "Espectro"] }),
      conv({ id: "c", areasCooperacion: ["Calidad del servicio", "Ciberseguridad"] }),
    ]);
    expect(overlap[0]).toBe("Calidad del servicio"); // en los tres, va primero
    expect(overlap).toContain("Ciberseguridad");
    expect(overlap).not.toContain("Espectro");
  });

  it("ignora acentos y mayúsculas al cruzar áreas", () => {
    const overlap = findOverlappingAreas([
      conv({ id: "a", areasCooperacion: ["Protección al usuario"] }),
      conv({ id: "b", areasCooperacion: ["proteccion al usuario"] }),
    ]);
    expect(overlap).toHaveLength(1);
  });

  it("no cuenta dos veces un área repetida dentro del mismo instrumento", () => {
    const overlap = findOverlappingAreas([
      conv({ id: "a", areasCooperacion: ["Calidad", "calidad"] }),
      conv({ id: "b", areasCooperacion: ["Espectro"] }),
    ]);
    expect(overlap).toEqual([]);
  });
});
