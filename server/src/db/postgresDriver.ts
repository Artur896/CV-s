import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

// Las queries se escriben con `?` (estilo SQLite); aquí se convierten a $1, $2... para Postgres.
function toPositional(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export async function initSchema(): Promise<void> {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.postgres.sql'), 'utf-8');
  await getPool().query(schema);
}

export async function dbGet<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const res = await getPool().query(toPositional(sql), params);
  return res.rows[0] as T | undefined;
}

export async function dbAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query(toPositional(sql), params);
  return res.rows as T[];
}

export async function dbRun(sql: string, params: unknown[] = []): Promise<void> {
  await getPool().query(toPositional(sql), params);
}

export function closeDb(): void {
  if (pool) {
    void pool.end();
    pool = null;
  }
}

export const todayCondition = "created_at::date = CURRENT_DATE";
