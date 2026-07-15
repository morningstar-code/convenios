/**
 * Generación de la Hoja de Ruta de un MoU — server-side ONLY.
 *
 * Se apoya en el resumen ejecutivo ya generado ("a merced del resumen"): el
 * resumen dice de qué va el instrumento y qué se comprometió; la hoja de ruta
 * lo convierte en actividades con fecha y responsables.
 */

import { getOpenAIClient, OpenAIExtractionError } from "@/lib/openai";
import {
  ROADMAP_JSON_SCHEMA,
  RoadmapSchema,
  type Roadmap,
} from "@/validators/roadmap.schema";

const DEFAULT_MODEL = "gpt-4.1";

function roadmapModel(): string {
  return (
    process.env.OPENAI_MODEL_ROADMAP ||
    process.env.OPENAI_MODEL_SUMMARY ||
    DEFAULT_MODEL
  );
}

const ROADMAP_SYSTEM_PROMPT = `Eres un analista de cooperación internacional del INDOTEL (Instituto Dominicano de las Telecomunicaciones, República Dominicana).

Tu tarea es redactar una PROPUESTA METODOLÓGICA DE TRABAJO (hoja de ruta) para ejecutar un memorando de entendimiento ya firmado con otra entidad reguladora. Es el documento que INDOTEL envía a la contraparte para acordar cómo se llevará el MoU a la práctica.

════════════════════════════════════════
QUÉ DEBES PRODUCIR
════════════════════════════════════════
- introduccion: 2-4 oraciones. Explica que las temáticas de interés común se muestran a continuación y cómo se priorizan en el tiempo (los intercambios de mayor prioridad primero, el resto más adelante).
- actividades: una entrada por temática de cooperación. Para cada una:
  • tematica: el área de cooperación, con su nombre institucional.
  • alineacion: si la temática se alinea con un instrumento, estudio o proyecto conocido mencionado en las fuentes, indícalo (ej. "Alineación: proyecto de medición de calidad 4G y 5G"). Si no hay base, usa null.
  • avances: qué tiene ya cada entidad en esa materia. Una entrada por entidad, usando su sigla como 'entidad' (ej. "INDOTEL", "CRC"). Si el documento no describe avances de una entidad, no la inventes: omítela.
  • espacio_tipo: el formato del intercambio. Usa exactamente uno de: "Mesa de trabajo", "Webinar", "Panel de expertos", "Visita técnica", "Videoconferencia".
  • espacio_fecha: mes y año, en texto y en español (ej. "Junio 2026"). Reparte las temáticas a lo largo del período de vigencia: las prioritarias en el primer semestre y el resto después. No pongas dos temáticas en el mismo espacio salvo que sea natural.
  • acciones: qué hará cada parte en ese espacio. 2-3 oraciones concretas, nombrando a las entidades.
- coordinacion: los puntos de contacto de cada parte, tal como los designa el instrumento (Anexo I o equivalente). Una entrada por entidad. Si un dato no está en las fuentes, escribe exactamente "Por designar" (para nombres) o "—" (para cargo, correo y teléfono). NUNCA inventes nombres, correos ni teléfonos.
- seguimiento: los hitos de control del período. Por defecto tres: reunión de inicio, revisión de mitad de etapa y cierre de etapa, cada uno con su mes/año y qué se hace en él.
- proximos_pasos: 3-5 pasos administrativos concretos para arrancar (remitir la propuesta, agendar la reunión de inicio, designar equipos técnicos…).

════════════════════════════════════════
REGLAS ABSOLUTAS
════════════════════════════════════════
- Las temáticas deben salir de las áreas de cooperación del instrumento. NO inventes áreas que el MoU no contempla.
- NUNCA inventes nombres de personas, correos, teléfonos ni programas institucionales. Si no están en las fuentes, usa "Por designar" o "—".
- Las fechas deben caer dentro de la vigencia del instrumento y ser posteriores a su firma.
- Si el MoU es no vinculante o sin obligaciones financieras, no propongas actividades que exijan presupuesto.
- Tono formal, institucional y en español.
- Devuelve SOLO el JSON válido del esquema, sin markdown ni explicaciones.`;

export interface RoadmapGenerationInput {
  /** Datos estructurados del instrumento (contraparte, país, vigencia, áreas…). */
  conventionData: Record<string, unknown>;
  /** Resumen ejecutivo ya generado, en texto plano. Es la fuente principal. */
  resumenEjecutivo?: string | null;
  /** Indicaciones opcionales del usuario. */
  instrucciones?: string | null;
}

export interface RoadmapGenerationResult {
  roadmap: Roadmap;
  model: string;
  latencyMs: number;
}

export async function generateConventionRoadmap(
  input: RoadmapGenerationInput
): Promise<RoadmapGenerationResult> {
  const client = getOpenAIClient();
  const model = roadmapModel();
  const start = Date.now();

  const resumenBlock = input.resumenEjecutivo?.trim()
    ? `FUENTE 1 — RESUMEN EJECUTIVO DEL INSTRUMENTO (fuente principal):\n${input.resumenEjecutivo.trim().slice(0, 20_000)}`
    : "FUENTE 1 — No hay resumen ejecutivo disponible. Trabaja solo con los campos estructurados.";

  const instruccionesBlock = input.instrucciones?.trim()
    ? `\n\nINDICACIONES DEL USUARIO (ajustan enfoque y calendario, no autorizan a inventar datos):\n${input.instrucciones.trim().slice(0, 1_000)}`
    : "";

  console.log(
    `[openai-roadmap] generando — model: ${model}, resumen: ${
      input.resumenEjecutivo ? `${input.resumenEjecutivo.length} chars` : "none"
    }`
  );

  let rawText: string;

  try {
    const response = await client.responses.create({
      model,
      input: [
        { role: "system", content: ROADMAP_SYSTEM_PROMPT },
        {
          role: "user",
          content: `${resumenBlock}

FUENTE 2 — CAMPOS ESTRUCTURADOS DEL INSTRUMENTO:
${JSON.stringify(input.conventionData, null, 2)}

Redacta la propuesta metodológica de trabajo (hoja de ruta) para ejecutar este instrumento.${instruccionesBlock}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "HojaDeRuta",
          schema: ROADMAP_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });

    rawText = response.output_text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[openai-roadmap] error de API: ${msg}`, err);
    throw new OpenAIExtractionError(`Error al generar la hoja de ruta: ${msg}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error(`[openai-roadmap] JSON inválido del modelo:\n${rawText.slice(0, 500)}`);
    throw new OpenAIExtractionError(
      "El modelo devolvió una respuesta inválida. Intenta generar la hoja de ruta nuevamente."
    );
  }

  const result = RoadmapSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[openai-roadmap] Zod falló", result.error.issues.slice(0, 5));
    throw new OpenAIExtractionError(
      "La hoja de ruta generada no cumple el formato esperado. Intenta nuevamente."
    );
  }

  const latencyMs = Date.now() - start;
  console.log(
    `[openai-roadmap] listo — ${result.data.actividades.length} actividades, ${latencyMs}ms`
  );

  return { roadmap: result.data, model, latencyMs };
}
