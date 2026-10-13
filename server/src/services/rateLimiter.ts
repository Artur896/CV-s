import { dbGet, todayCondition } from '../db/db';
import { env } from '../config/env';

export class AiLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiLimitError';
  }
}

export async function getUsedToday(): Promise<number> {
  const row = await dbGet<{ count: number }>(
    `SELECT COUNT(*) as count FROM ai_usage_log WHERE success = 1 AND ${todayCondition}`
  );
  return Number(row?.count || 0);
}

export async function getUsedForInterview(interviewId: string): Promise<number> {
  const row = await dbGet<{ count: number }>(
    `SELECT COUNT(*) as count FROM ai_usage_log WHERE success = 1 AND interview_id = ?`,
    [interviewId]
  );
  return Number(row?.count || 0);
}

export async function assertWithinLimits(interviewId: string | null): Promise<void> {
  const usedToday = await getUsedToday();
  if (usedToday >= env.MAX_AI_REQUESTS_PER_DAY) {
    throw new AiLimitError('Se alcanzó el límite diario de solicitudes a la IA.');
  }

  if (interviewId) {
    const usedInInterview = await getUsedForInterview(interviewId);
    if (usedInInterview >= env.MAX_AI_REQUESTS_PER_INTERVIEW) {
      throw new AiLimitError('Se alcanzó el límite de solicitudes de IA para esta entrevista.');
    }
  }
}

export async function getLastError(): Promise<string | null> {
  const row = await dbGet<{ error_message: string }>(
    `SELECT error_message FROM ai_usage_log WHERE success = 0 ORDER BY created_at DESC LIMIT 1`
  );
  return row ? row.error_message : null;
}
