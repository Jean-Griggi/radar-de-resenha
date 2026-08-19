import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().optional(),
  API_PORT: z.coerce.number().default(3333),
  JWT_SECRET: z.string().min(8).default('change-me-dev-secret'),
  DATABASE_URL: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  STORAGE_DIR: z.string().optional(),
  PUBLIC_API_URL: z.string().default('http://localhost:3333'),
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

export function corsOrigins() {
  const extra = env.CORS_ORIGINS?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    env.WEB_ORIGIN,
    ...extra,
  ];
}
