import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

function monorepoRoot() {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = path.dirname(dir);
  }
  return path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
}

const nextConfig: NextConfig = {
  transpilePackages: ['@resenhometro/ui', '@resenhometro/shared'],
  outputFileTracingRoot: monorepoRoot(),
  outputFileTracingIncludes: {
    '/*': [
      '../../packages/ui/**/*',
      '../../packages/shared/dist/**/*',
      '../../packages/shared/package.json',
    ],
  },
  devIndicators: false,
};

export default nextConfig;
