/**
 * Pasa la ficha/resumen ejecutivo a texto plano. Lo usan el botón "Copiar" del
 * panel de IA y el generador de la hoja de ruta, que se alimenta del resumen.
 * Solo tipos: se puede importar desde cliente y desde servidor.
 */

import type { FichaConvenio } from "@/lib/openai";
import { normalizeFichaDuracionCell } from "@/lib/utils";

export function fichaToPlainText(ficha: FichaConvenio): string {
  return [
    ficha.nombreDocumento,
    "",
    `Tipo de Instrumento: ${ficha.tipoInstrumento}`,
    `Fecha de Firma: ${ficha.fechaFirma}`,
    `Duración: ${normalizeFichaDuracionCell(ficha.duracion)}`,
    `Estatus: ${ficha.estatus}`,
    `Condición de Terminación: ${ficha.condicionTerminacion}`,
    `Punto Focal: ${ficha.puntoFocal}`,
    `Direcciones Involucradas:\n${ficha.direccionesInvolucradas}`,
    `Enlace: ${ficha.enlace}`,
    "",
    `OBJETIVO\n${ficha.objetivo}`,
    "",
    `MODALIDADES DE COOPERACIÓN\n${ficha.modalidadesCooperacion}`,
    "",
    `ACTIVIDADES\n${ficha.actividades}`,
    "",
    `ÁREAS DE COOPERACIÓN TÉCNICA\n${ficha.areasCooperacion}`,
    "",
    `TEMAS SUGERIDOS\n${ficha.temasSugeridos}`,
    "",
    `RESPONSABILIDAD FINANCIERA\n${ficha.responsabilidadFinanciera}`,
    "",
    `IMPACTO ESPERADO\n${ficha.impactoEsperado}`,
    "",
    `CONCLUSIÓN\n${ficha.conclusion}`,
  ].join("\n");
}
