import { copyFileSync, existsSync, writeFileSync } from 'node:fs';

if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
}

const webEnv = 'apps/web/.env.local';
if (!existsSync(webEnv)) {
  writeFileSync(webEnv, 'NEXT_PUBLIC_API_URL=http://localhost:3333\n');
}
