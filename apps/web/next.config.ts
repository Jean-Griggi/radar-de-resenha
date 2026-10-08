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

/**
 * Proxy da API pelo domínio do site. Com `API_PROXY_TARGET` definido, o navegador fala só com o próprio
 * site (`NEXT_PUBLIC_API_URL=/api-proxy`) e o Next repassa para a API. O cookie de sessão passa a ser
 * "de primeira parte": Safari/iPhone, Brave e Firefox estrito bloqueiam cookie de outro domínio, e sem
 * ele o login funciona, a próxima chamada volta 401 e a pessoa cai de novo na tela de login.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/+$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    return apiProxyTarget ? [{ source: '/api-proxy/:path*', destination: `${apiProxyTarget}/:path*` }] : [];
  },
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
