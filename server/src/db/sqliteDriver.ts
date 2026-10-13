import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

let instance: DatabaseSync | null = null;

function getInstance(): DatabaseSync {
  if (instance) return instance;

  const dbPath = env.DB_PATH;
  const dir = path.dirname(dbPath);
  if (dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  instance = new DatabaseSync(dbPath);
  instance.exec('PRAGMA journal_mode = WAL');
  instance.exec('PRAGMA foreign_keys = ON');

  return instance;
}

export async function initSchema(): Promise<void> {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sqlite.sql'), 'utf-8');
  getInstance().exec(schema);
}

export async function dbGet<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return getInstance().prepare(sql).get(...params) as T | undefined;
}

export async function dbAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return getInstance().prepare(sql).all(...params) as T[];
}

export async function dbRun(sql: string, params: unknown[] = []): Promise<void> {
  getInstance().prepare(sql).run(...params);
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

export const todayCondition = "date(created_at) = date('now')";
