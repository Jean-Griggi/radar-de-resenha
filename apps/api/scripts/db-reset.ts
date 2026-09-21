/**
 * Zera só o banco de desenvolvimento local.
 * Nunca apaga Supabase / Postgres remoto. Só zera PGlite, uploads e DATABASE_URL localhost/Docker.
 */
import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(scriptDir, '..');
const repoRoot = resolve(apiRoot, '../..');
const dataDir = resolve(apiRoot, 'data');

config({ path: resolve(repoRoot, '.env') });
config({ path: resolve(apiRoot, '.env') });

const REMOTE_HOST_HINTS = [
  'supabase.co',
  'supabase.com',
  'neon.tech',
  'neon.build',
  'amazonaws.com',
  'railway.app',
  'render.com',
  'azure.com',
  'googleusercontent.com',
  'planetscale.com',
  'timescale.com',
  'heroku.com',
  'digitalocean.com',
  'fly.dev',
  'fly.io',
  'vercel-storage.com',
  'upstash.io',
  'cockroachlabs.cloud',
  'aivencloud.com',
  'elephantsql.com',
];

type DbKind = 'unset' | 'local' | 'remote';

function parseDbHost(raw: string): string | null {
  try {
    return new URL(raw.replace(/^postgresql:/i, 'postgres:')).hostname.replace(/^\[|\]$/g, '').toLowerCase();
  } catch {
    return null;
  }
}

function isPrivateIpv4(host: string) {
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  return /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host);
}

function isLocalHostname(host: string) {
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return true;
  if (host === 'host.docker.internal') return true;
  if (host === 'postgres' && !host.includes('.')) return true;
  return isPrivateIpv4(host);
}

function looksRemote(host: string) {
  return REMOTE_HOST_HINTS.some((hint) => host === hint || host.endsWith(`.${hint}`));
}

function classifyDatabaseUrl(raw: string | undefined): { kind: DbKind; host: string | null } {
  const value = raw?.trim();
  if (!value) return { kind: 'unset', host: null };
  const host = parseDbHost(value);
  if (!host || looksRemote(host) || !isLocalHostname(host)) {
    return { kind: 'remote', host };
  }
  return { kind: 'local', host };
}

async function rmrf(path: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolveWait) => setTimeout(resolveWait, 200));
    }
  }
  throw lastError;
}

function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: true });
  return result.status === 0;
}

async function wipeLocalPostgres(databaseUrl: string) {
  console.log('Postgres local: tentando `docker compose down -v` + `up -d` (volume pgdata).');
  const down = run('docker', ['compose', 'down', '-v'], repoRoot);
  if (down) {
    const up = run('docker', ['compose', 'up', '-d'], repoRoot);
    if (up) {
      console.log('Volume Docker zerado. Schema volta no próximo `pnpm --filter @resenhometro/api dev`.');
      return;
    }
  } else {
    console.log('Docker Compose indisponível ou daemon parado. Caindo para DROP SCHEMA via DATABASE_URL local.');
  }

  const postgres = (await import('postgres')).default;
  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: false,
    prepare: false,
    connect_timeout: 8,
  });
  try {
    await sql.unsafe('DROP SCHEMA IF EXISTS public CASCADE');
    await sql.unsafe('CREATE SCHEMA public');
    await sql.unsafe('GRANT ALL ON SCHEMA public TO public');
    console.log('Schema public do Postgres local recriado vazio.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  const db = classifyDatabaseUrl(process.env.DATABASE_URL);

  console.log('Reset do banco local (dev only).');
  console.log(`- pasta de dados: ${dataDir}`);
  console.log(
    db.kind === 'unset'
      ? '- DATABASE_URL: ausente (PGlite)'
      : `- DATABASE_URL: ${db.kind} (${db.host ?? 'host ilegível'})`,
  );

  const wiped: string[] = [];
  const skipped: string[] = ['.env e secrets', 'código do produto'];

  console.log('Apagando apps/api/data/ (PGlite + uploads)…');
  await rmrf(dataDir);
  wiped.push('apps/api/data/ (PGlite em data/pglite e uploads em data/uploads)');

  if (db.kind === 'local' && process.env.DATABASE_URL) {
    await wipeLocalPostgres(process.env.DATABASE_URL);
    wiped.push(`Postgres local em ${db.host}`);
  } else if (db.kind === 'remote') {
    skipped.push(`DATABASE_URL remoto (${db.host ?? 'host ilegível'}) — Supabase/produção intocado`);
    console.error(
      'DATABASE_URL não é localhost/Docker. Não conectei nem apaguei esse banco. Supabase de produção permanece intacto.',
    );
  } else {
    skipped.push('volume Docker pgdata (sem DATABASE_URL local neste ambiente)');
    skipped.push('Supabase / Postgres de produção');
  }

  console.log('\nApagado:');
  for (const item of wiped) console.log(`  - ${item}`);
  console.log('Não apagado:');
  for (const item of skipped) console.log(`  - ${item}`);
  console.log('\nSuba a API de novo: o schema vazio é recriado por applyMigrations.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  console.error('Se a pasta data/ estiver travada, pare a API (`pnpm --filter @resenhometro/api dev`) e rode de novo.');
  process.exit(1);
});
