import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

export function isProductionLike(source: NodeJS.ProcessEnv = process.env) {
  return source.NODE_ENV === 'production' || Boolean(source.VERCEL);
}

export function jwtSecretSchema(productionLike: boolean) {
  return productionLike
    ? z
        .string({ required_error: 'JWT_SECRET é obrigatório em produção' })
        .min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres em produção')
    : z.string().min(8).default('change-me-dev-secret');
}

const productionLike = isProductionLike();

const envSchema = z.object({
  PORT: z.coerce.number().optional(),
  API_PORT: z.coerce.number().default(3333),
  JWT_SECRET: jwtSecretSchema(productionLike),
  DATABASE_URL: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  STORAGE_DIR: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('resenhometro-uploads'),
  PUBLIC_API_URL: z.string().default(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3333',
  ),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  SPOTIFY_REDIRECT_URI: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
});

export const env = envSchema.parse(process.env);

const LOCAL_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
];

function isLocalDevOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/** Allowlist: localhost (dev) + WEB_ORIGIN + CORS_ORIGINS. Sem curingas `*.vercel.app`. */
export function resolveCorsOrigins(options: {
  webOrigin: string;
  extraOrigins?: string;
  productionLike: boolean;
}) {
  const extra = options.extraOrigins?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
  const listed = [options.webOrigin, ...extra];
  if (!options.productionLike) {
    listed.push(...LOCAL_DEV_ORIGINS);
  }
  const unique = [...new Set(listed.filter(Boolean))];
  if (!options.productionLike) return unique;
  return unique.filter((origin) => !isLocalDevOrigin(origin));
}

export function corsOrigins() {
  return resolveCorsOrigins({
    webOrigin: env.WEB_ORIGIN,
    extraOrigins: env.CORS_ORIGINS,
    productionLike,
  });
}

export function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true;
  return corsOrigins().includes(origin);
}
