import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

function toInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const env = {
  PORT: toInt(process.env.PORT, 4810),
  DB_PATH: process.env.DB_PATH || './data/app.sqlite',
  DATABASE_URL: process.env.DATABASE_URL || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '',

  AI_PROVIDER: process.env.AI_PROVIDER || 'groq',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  GROQ_BASE_URL: 'https://api.groq.com/openai/v1',

  MAX_AI_REQUESTS_PER_INTERVIEW: toInt(process.env.MAX_AI_REQUESTS_PER_INTERVIEW, 8),
  MAX_AI_REQUESTS_PER_DAY: toInt(process.env.MAX_AI_REQUESTS_PER_DAY, 50),
  AI_TIMEOUT_MS: toInt(process.env.AI_TIMEOUT_MS, 15000),
  AI_MAX_TOKENS: toInt(process.env.AI_MAX_TOKENS, 600)
};

export function isAiConfigured(): boolean {
  return Boolean(env.GROQ_API_KEY);
}
