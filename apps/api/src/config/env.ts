import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

const envSchema = z.object({
  API_PORT: z.coerce.number().default(3333),
  JWT_SECRET: z.string().min(8),
});

export const env = envSchema.parse(process.env);
