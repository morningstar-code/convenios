import { describe, expect, it } from "vitest";
import {
  INDOTEL_ORG,
  filterDirecciones,
  filterDireccionesText,
  findUnknownDirecciones,
  matchUnidad,
} from "@/lib/indotel-org";

describe("matchUnidad — reconoce lo que sí existe", () => {
  it("acepta el nombre oficial exacto", () => {
    expect(matchUnidad("Dirección de Relaciones Internacionales")?.nombre).toBe(
      "Dirección de Relaciones Internacionales"
    );
  });

  it("tolera mayúsculas, acentos y espacios de más", () => {
    expect(matchUnidad("  DIRECCION  DE   RELACIONES INTERNACIONALES ")?.nombre).toBe(
      "Dirección de Relaciones Internacionales"
    );
  });

  it("completa el nombre oficial cuando la IA lo acorta", () => {
    expect(matchUnidad("Dirección de Ciberseguridad")?.nombre).toBe(
      "Dirección de Ciberseguridad, Comercio Electrónico y Firma Digital"
    );
    expect(matchUnidad("Dirección de Tecnología de la Información")?.nombre).toBe(
      "Dirección de Tecnología de la Información y Comunicación"
    );
  });

  it("resuelve 'de' por 'del' y variantes menores", () => {
    expect(matchUnidad("Dirección de Espectro Radioeléctrico")?.nombre).toBe(
      "Dirección del Espectro Radioeléctrico"
    );
  });

  it("reconoce por siglas", () => {
    expect(matchUnidad("FDT")?.nombre).toBe(
      "Dirección del Fondo de Desarrollo de las Telecomunicaciones — FDT"
    );
    expect(matchUnidad("OAI")?.tipo).toBe("autoridad");
  });

  it("encuentra la unidad aunque se escriba sin la sigla final", () => {
    expect(
      matchUnidad("Dirección del Fondo de Desarrollo de las Telecomunicaciones")?.siglas
    ).toBe("FDT");
  });

  it("ante ambigüedad prefiere la Dirección sobre el Departamento", () => {
    // Existen la Dirección y el Departamento de Relaciones Internacionales.
    expect(matchUnidad("Relaciones Internacionales")?.tipo).toBe("direccion");
  });
});

describe("matchUnidad — rechaza lo que la IA se inventa", () => {
  it.each([
    "Dirección de Ambiente y Desarrollo Sostenible",
    "Dirección de Innovación Digital",
    "Departamento de Asuntos Espaciales",
    "Oficina de Cooperación Internacional del Caribe",
    "Ministerio de Relaciones Exteriores",
  ])("descarta %s", (inventada) => {
    expect(matchUnidad(inventada)).toBeNull();
  });

  it("descarta vacíos y basura", () => {
    expect(matchUnidad("")).toBeNull();
    expect(matchUnidad("   ")).toBeNull();
    expect(matchUnidad("—")).toBeNull();
    expect(matchUnidad("N/A")).toBeNull();
  });
});

describe("filterDirecciones", () => {
  it("deja solo las oficiales y con su nombre completo", () => {
    expect(
      filterDirecciones([
        "Dirección de Relaciones Internacionales",
        "Dirección de Innovación Digital", // inventada
        "Dirección de Ciberseguridad", // acortada
      ])
    ).toEqual([
      "Dirección de Relaciones Internacionales",
      "Dirección de Ciberseguridad, Comercio Electrónico y Firma Digital",
    ]);
  });

  it("no repite una misma unidad escrita de dos formas", () => {
    expect(
      filterDirecciones([
        "Dirección de Ciberseguridad",
        "Dirección de Ciberseguridad, Comercio Electrónico y Firma Digital",
      ])
    ).toHaveLength(1);
  });

  it("devuelve vacío si todo era inventado", () => {
    expect(filterDirecciones(["Dirección de Marte", "Comité Galáctico"])).toEqual([]);
  });
});

describe("filterDireccionesText", () => {
  it("limpia el texto con saltos de línea y viñetas de la ficha", () => {
    const input = [
      "• Dirección de Relaciones Internacionales",
      "- Dirección de Ciberseguridad",
      "Dirección de Asuntos Marítimos",
      "",
    ].join("\n");

    expect(filterDireccionesText(input)).toBe(
      [
        "Dirección de Relaciones Internacionales",
        "Dirección de Ciberseguridad, Comercio Electrónico y Firma Digital",
      ].join("\n")
    );
  });

  it("devuelve cadena vacía cuando no hay nada válido", () => {
    expect(filterDireccionesText("Dirección Inexistente")).toBe("");
  });
});

describe("findUnknownDirecciones", () => {
  it("señala exactamente lo que no está en el organigrama", () => {
    expect(
      findUnknownDirecciones([
        "Dirección Jurídica",
        "Dirección de Cosas Raras",
        "Dirección de Protocolo",
      ])
    ).toEqual(["Dirección de Cosas Raras"]);
  });
});

describe("catálogo", () => {
  it("no tiene nombres duplicados", () => {
    const nombres = INDOTEL_ORG.map((u) => u.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it("cada unidad del catálogo se reconoce a sí misma", () => {
    for (const unidad of INDOTEL_ORG) {
      expect(matchUnidad(unidad.nombre)?.nombre).toBe(unidad.nombre);
    }
  });

  it("incluye las 20 direcciones principales del organigrama 2026", () => {
    expect(INDOTEL_ORG.filter((u) => u.tipo === "direccion")).toHaveLength(20);
  });
});
