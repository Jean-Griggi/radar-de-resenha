import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import { env } from '../config/env.js';
import { applyMigrations } from './migrate.js';

type QueryResult = { rows: Record<string, unknown>[] };

let runQuery: (sql: string, params?: unknown[]) => Promise<QueryResult>;
let ready = false;

export async function initDb() {
  if (ready) return;

  if (env.DATABASE_URL) {
    const sql = postgres(env.DATABASE_URL, {
      max: 10,
      ssl: 'require',
      connect_timeout: 15,
    });
    runQuery = async (text, params = []) => {
      const rows = await sql.unsafe(text, params as never[]);
      return { rows: rows as unknown as Record<string, unknown>[] };
    };
  } else {
    const dataDir = resolve(process.cwd(), 'data', 'pglite');
    await mkdir(dataDir, { recursive: true });
    const client = new PGlite(dataDir);
    await client.waitReady;
    runQuery = async (text, params = []) => {
      const result = await client.query(text, params);
      return { rows: (result.rows ?? []) as Record<string, unknown>[] };
    };
  }

  await applyMigrations(async (sql, params = []) => {
    const result = await runQuery(sql, params);
    return result.rows;
  });
  ready = true;
}

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  if (!runQuery) await initDb();
  const result = await runQuery(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export async function exec(sql: string, params: unknown[] = []) {
  await query(sql, params);
}
