import { describe, expect, it } from "vitest";
import { parseFichaDate } from "./ficha-date-parse";
import { parseDraftContenidoObject, pickFechaFirmaTextFromDraftRecord } from "./ficha-draft-json";

describe("parseFichaDate", () => {
  it("parses Spanish without first de", () => {
    const d = parseFichaDate("10 mayo de 2017");
    expect(d?.toISOString().slice(0, 10)).toBe("2017-05-10");
  });

  it("strips zero-width spaces", () => {
    const d = parseFichaDate("10\u200B mayo\u200B de 2017");
    expect(d?.toISOString().slice(0, 10)).toBe("2017-05-10");
  });
});

describe("parseDraftContenidoObject", () => {
  it("unwraps double-encoded JSON string", () => {
    const inner = JSON.stringify({
      nombreDocumento: "x",
      fechaFirma: "10 mayo de 2017",
      tipoInstrumento: "m",
      duracion: "",
      estatus: "",
      condicionTerminacion: "",
      puntoFocal: "",
      direccionesInvolucradas: "",
      enlace: "",
      objetivo: "",
      modalidadesCooperacion: "",
      actividades: "",
      areasCooperacion: "",
      temasSugeridos: "",
      responsabilidadFinanciera: "",
      impactoEsperado: "",
      conclusion: "",
    });
    const blob = JSON.stringify(inner);
    const rec = parseDraftContenidoObject(blob);
    expect(rec).toBeTruthy();
    expect(pickFechaFirmaTextFromDraftRecord(rec!)).toBe("10 mayo de 2017");
    expect(parseFichaDate(pickFechaFirmaTextFromDraftRecord(rec!))?.toISOString().slice(0, 10)).toBe(
      "2017-05-10"
    );
  });
});
