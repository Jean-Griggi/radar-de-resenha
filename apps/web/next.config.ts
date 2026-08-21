import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.join(fileURLToPath(new URL('.', import.meta.url)), '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@resenhometro/ui', '@resenhometro/shared'],
  outputFileTracingRoot: projectRoot,
  devIndicators: false,
};

export default nextConfig;
