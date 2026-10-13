import { v4 as uuidv4 } from 'uuid';
import { env, isAiConfigured } from '../config/env';
import { dbRun } from '../db/db';
import { assertWithinLimits, AiLimitError } from './rateLimiter';
import { ResponseRow } from '../types';

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

interface GroqMessage {
  role: 'system' | 'user';
  content: string;
}

async function logUsage(
  interviewId: string | null,
  callType: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await dbRun(
    `INSERT INTO ai_usage_log (id, interview_id, call_type, success, error_message)
     VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), interviewId, callType, success ? 1 : 0, errorMessage || null]
  );
}

async function callGroq(messages: GroqMessage[], interviewId: string | null, callType: string): Promise<string> {
  if (!isAiConfigured()) {
    throw new AiUnavailableError('Groq no está configurado (falta GROQ_API_KEY).');
  }

  await assertWithinLimits(interviewId); // lanza AiLimitError si se excede, sin llamar a la API

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const res = await fetch(`${env.GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        messages,
        max_tokens: env.AI_MAX_TOKENS,
        temperature: 0.4
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Groq respondió ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Respuesta de Groq sin contenido.');
    }

    await logUsage(interviewId, callType, true);
    return content;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido al llamar a Groq';
    await logUsage(interviewId, callType, false, message);
    if (err instanceof AiLimitError) throw err;
    throw new AiUnavailableError(message);
  } finally {
    clearTimeout(timeout);
  }
}

const NO_INVENT_RULE =
  'Reglas estrictas: usa solo la información que el candidato proporcionó. ' +
  'No inventes empresas, años de experiencia, certificaciones, resultados ni habilidades que no se mencionen. ' +
  'No corrijas ni juzgues ortografía o forma de hablar del candidato; solo mejora la redacción y el orden de las ideas. ' +
  'Responde en español, de forma breve y directa.';

export async function generateFollowUp(
  interviewId: string,
  questionText: string,
  answer: string
): Promise<string> {
  const messages: GroqMessage[] = [
    { role: 'system', content: NO_INVENT_RULE },
    {
      role: 'user',
      content:
        `Pregunta hecha al candidato: "${questionText}"\n` +
        `Respuesta del candidato: "${answer.slice(0, 500)}"\n\n` +
        'La respuesta es muy breve o general. Genera UNA sola pregunta corta, sencilla y respetuosa ' +
        'para pedir un ejemplo concreto o más detalle. Responde solo con la pregunta, sin explicaciones.'
    }
  ];
  const content = await callGroq(messages, interviewId, 'follow_up');
  return content.trim();
}

export interface RewriteResult {
  responseId: string;
  professionalRewrite: string;
}

export interface CvGenerationResult {
  rewrites: RewriteResult[];
  profileSummary: string;
  suggestedRoles: string[];
}

export async function rewriteAndBuildProfile(
  interviewId: string,
  responses: ResponseRow[],
  detectedSkills: string[]
): Promise<CvGenerationResult> {
  const compactResponses = responses
    .map((r, i) => `(${i + 1}) [${r.category}] P: ${r.question_text}\nR: ${r.original_answer.slice(0, 400)}`)
    .join('\n\n');

  const messages: GroqMessage[] = [
    { role: 'system', content: NO_INVENT_RULE },
    {
      role: 'user',
      content:
        'Estas son las respuestas de una entrevista a un trabajador de la construcción:\n\n' +
        `${compactResponses}\n\n` +
        `Habilidades ya detectadas por reglas: ${detectedSkills.join(', ') || 'ninguna'}\n\n` +
        'Devuelve SOLO un JSON válido (sin texto adicional) con esta forma exacta:\n' +
        '{"rewrites": [{"index": 1, "text": "redacción profesional de la respuesta 1"}, ...], ' +
        '"profileSummary": "resumen de perfil profesional en 3-4 líneas", ' +
        '"suggestedRoles": ["puesto 1", "puesto 2"]}\n' +
        'El campo "index" debe corresponder al número de cada respuesta listada arriba. ' +
        'No agregues información que el candidato no haya dicho.'
    }
  ];

  const content = await callGroq(messages, interviewId, 'cv_generation');

  let parsed: {
    rewrites?: { index: number; text: string }[];
    profileSummary?: string;
    suggestedRoles?: string[];
  };

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    throw new AiUnavailableError('No se pudo interpretar la respuesta de Groq (formato inesperado).');
  }

  const rewrites: RewriteResult[] = (parsed.rewrites || [])
    .map((r) => {
      const response = responses[r.index - 1];
      if (!response) return null;
      return { responseId: response.id, professionalRewrite: r.text };
    })
    .filter((r): r is RewriteResult => r !== null);

  return {
    rewrites,
    profileSummary: parsed.profileSummary || '',
    suggestedRoles: parsed.suggestedRoles || []
  };
}
