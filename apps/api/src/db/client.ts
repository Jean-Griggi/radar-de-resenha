import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { env } from '../config/env.js';
import { applyMigrations } from './migrate.js';

type QueryResult = { rows: Record<string, unknown>[] };

let runQuery: (sql: string, params?: unknown[]) => Promise<QueryResult>;
let ready = false;

/** Transaction pooler (Supabase :6543) deadlocks if postgres.js pipelines two queries on one connection. */
const POOL_MAX = process.env.VERCEL ? 5 : 10;
let inflight = 0;
const waiters: Array<() => void> = [];

async function acquireSlot() {
  if (inflight < POOL_MAX) {
    inflight += 1;
    return;
  }
  await new Promise<void>((resolve) => {
    waiters.push(() => {
      inflight += 1;
      resolve();
    });
  });
}

function releaseSlot() {
  inflight -= 1;
  const next = waiters.shift();
  if (next) next();
}

export async function initDb() {
  if (ready) return;

  if (env.DATABASE_URL) {
    const sql = postgres(env.DATABASE_URL, {
      // Serverless: poucas conexões por isolate. Processo longo (Render/local): um pouco mais.
      max: POOL_MAX,
      ssl: 'require',
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    runQuery = async (text, params = []) => {
      const rows = await sql.unsafe(text, params as never[]);
      return { rows: rows as unknown as Record<string, unknown>[] };
    };
  } else if (process.env.VERCEL) {
    throw new Error('DATABASE_URL is required on Vercel');
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
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
  await acquireSlot();
  try {
    const result = await runQuery(sql, params);
    return result.rows as T[];
  } finally {
    releaseSlot();
  }
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export async function exec(sql: string, params: unknown[] = []) {
  await query(sql, params);
}
