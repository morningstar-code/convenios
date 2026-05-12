import { describe, expect, it } from "vitest";
import {
  choosePreferredDocumentName,
  choosePreferredFichaDuration,
  choosePreferredFinancialResponsibilitySummary,
  choosePreferredPointFocal,
} from "@/lib/openai";

describe("choosePreferredPointFocal", () => {
  it("prefers the structured INDOTEL focal point over a counterpart contact", () => {
    const result = choosePreferredPointFocal(
      "Mariana Sarmiento Arguello, CRC",
      {
        institucionPropia: "Instituto Dominicano de las Telecomunicaciones (INDOTEL)",
        contraparte: "CRC",
        puntoFocal: "Amparo Arango Echeverri",
        cargoPuntoFocal: "Directora de Relaciones Internacionales",
      }
    );

    expect(result).toContain("Amparo Arango Echeverri");
    expect(result).toContain("Directora de Relaciones Internacionales");
    expect(result).not.toContain("CRC");
    expect(result).not.toContain("Mariana Sarmiento");
  });

  it("prefers the structured API focal point over the summary model output", () => {
    const result = choosePreferredPointFocal(
      "Mariana Sarmiento Arguello, Directora Ejecutiva",
      {
        institucionPropia: "Instituto Dominicano de las Telecomunicaciones (INDOTEL)",
        contraparte: "CRC",
        puntoFocal: "Sonia Vazquez",
        cargoPuntoFocal: "Directora de Relaciones Internacionales",
      }
    );

    expect(result).toContain("Sonia Vazquez");
    expect(result).toContain("Directora de Relaciones Internacionales");
    expect(result).not.toContain("Mariana Sarmiento");
    expect(result).not.toContain("CRC");
  });

  it("keeps the API focal point when it already comes from INDOTEL extraction", () => {
    const result = choosePreferredPointFocal(
      "Sonia Vazquez",
      {
        institucionPropia: "Instituto Dominicano de las Telecomunicaciones (INDOTEL)",
        contraparte: "UNFPA",
        puntoFocal: "Ana Carolina Franco",
        cargoPuntoFocal: "Gerente, Gerencia del Fondo de Desarrollo de las Telecomunicaciones",
      }
    );

    expect(result).toContain("Ana Carolina Franco");
    expect(result).toContain("Gerente");
    expect(result).not.toContain("Sonia Vazquez");
  });
});

describe("choosePreferredFichaDuration", () => {
  it("returns Indefinida when the document says the agreement has indefinite validity", () => {
    const documentText = `
      Este MDE permanecerá en vigor a partir de la fecha de su firma, y tendrá una vigencia indefinida.
      Cualquiera de LAS PARTES podrá dar por terminado este MDE, dando tres (3) meses de aviso por escrito a la otra Parte.
    `;

    const result = choosePreferredFichaDuration(
      "3 meses",
      { duracionTexto: "", duracionMeses: null },
      documentText
    );

    expect(result).toBe("Indefinida");
  });

  it("does not confuse termination notice with fixed duration", () => {
    const result = choosePreferredFichaDuration(
      "3 meses de aviso por escrito",
      { duracionTexto: "", duracionMeses: null },
      undefined
    );

    expect(result).toBe("Indefinida");
  });

  it("returns Indefinida when vigenciaTipo or termination clause marks the agreement as open-ended", () => {
    const result = choosePreferredFichaDuration(
      "3 meses",
      {
        vigenciaTipo: "vigencia indefinida",
        condicionTerminacion:
          "Sin vencimiento fijo; puede darse por terminado mediante notificación con al menos 90 días de antelación.",
        duracionTexto: "",
        duracionMeses: 3,
      },
      undefined
    );

    expect(result).toBe("Indefinida");
  });
});

describe("choosePreferredDocumentName", () => {
  it("prefers the PDF filename over AI-extracted title", () => {
    const result = choosePreferredDocumentName(
      "ACUERDO DE COOPERACION",
      {
        nombreConvenio: "Acuerdo de Cooperacion INDOTEL-UNFPA",
        documentoBase: "ACUERDO-DE-COOPERACION-INDOTEL-ITU-U4SSC-JULIO-7-2025-espanol.pdf",
      }
    );

    expect(result).toBe("ACUERDO-DE-COOPERACION-INDOTEL-ITU-U4SSC-JULIO-7-2025-espanol");
  });

  it("falls back to extracted title when no PDF filename exists", () => {
    const result = choosePreferredDocumentName("Model title", {
      nombreConvenio: "Acuerdo de Cooperacion INDOTEL-UNFPA",
    });

    expect(result).toBe("Acuerdo de Cooperacion INDOTEL-UNFPA");
  });

  it("falls back to model output when no other data exists", () => {
    const result = choosePreferredDocumentName("ACUERDO DE COOPERACION", {});
    expect(result).toBe("ACUERDO DE COOPERACION");
  });
});

describe("choosePreferredFinancialResponsibilitySummary", () => {
  it("overrides with evidence text when structured says true and model says no", () => {
    const evidence =
      "2.1 Para la ejecución de la Actividad, el INDOTEL abonará a la UIT los costos por un importe igual a 7 000 CHF (siete mil francos suizos). El pago se depositará en la cuenta UBS Switzerland AG.";
    const result = choosePreferredFinancialResponsibilitySummary(
      "No contempla compromisos financieros.",
      {
        responsabilidadFinanciera: true,
        montoReferencial: "",
        responsabilidadFinancieraEvidencia: evidence,
      }
    );
    expect(result).toContain("sí contempla responsabilidad financiera");
    expect(result).toContain("INDOTEL abonará");
    expect(result).toContain("7 000 CHF");
  });

  it("overrides with document text signals when model says no", () => {
    const result = choosePreferredFinancialResponsibilitySummary(
      "No existe compromiso financiero.",
      { responsabilidadFinanciera: false, montoReferencial: "7 000 CHF" },
      "el INDOTEL abonará a la UIT los costos de la Actividad por un importe igual a 7 000 CHF."
    );
    expect(result).toContain("sí contempla responsabilidad financiera");
    expect(result).toContain("7 000 CHF");
  });

  it("overrides with evidence when model says no and evidence has payment signals", () => {
    const evidence =
      "el INDOTEL abonará a la UIT los costos de la Actividad por un importe igual a 7 000 CHF";
    const result = choosePreferredFinancialResponsibilitySummary(
      "No existe responsabilidad financiera.",
      {
        responsabilidadFinanciera: false,
        montoReferencial: "7 000 CHF",
        responsabilidadFinancieraEvidencia: evidence,
      }
    );
    expect(result).toContain("sí contempla responsabilidad financiera");
    expect(result).toContain("INDOTEL abonará");
  });

  it("keeps model detailed positive output when model already says yes", () => {
    const detailed =
      "El instrumento sí contempla responsabilidad financiera. INDOTEL abonará a la UIT los costos de la Actividad por un importe de 7 000 CHF (siete mil francos suizos). El pago se realizará dentro de los 30 días siguientes a la firma, depositado en la cuenta UBS Switzerland AG, Ginebra. IBAN: CH58 0024 0240 C810 8400 2.";
    const result = choosePreferredFinancialResponsibilitySummary(
      detailed,
      { responsabilidadFinanciera: true, montoReferencial: "7 000 CHF" }
    );
    expect(result).toBe(detailed);
  });

  it("keeps model output when there are genuinely no financial signals", () => {
    const result = choosePreferredFinancialResponsibilitySummary(
      "El instrumento no genera obligaciones financieras entre las partes.",
      { responsabilidadFinanciera: false, montoReferencial: "" }
    );
    expect(result).toBe("El instrumento no genera obligaciones financieras entre las partes.");
  });
});
