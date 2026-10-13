import { env } from '../config/env';
import * as sqliteDriver from './sqliteDriver';
import * as postgresDriver from './postgresDriver';

// Postgres (Supabase) en producción cuando hay DATABASE_URL; SQLite local en desarrollo y tests.
const driver = env.DATABASE_URL ? postgresDriver : sqliteDriver;

export const dbGet = driver.dbGet;
export const dbAll = driver.dbAll;
export const dbRun = driver.dbRun;
export const closeDb = driver.closeDb;
export const todayCondition = driver.todayCondition;

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = driver.initSchema();
  }
  return schemaReady;
}
