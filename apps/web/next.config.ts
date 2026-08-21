import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@resenhometro/ui', '@resenhometro/shared'],
  devIndicators: false,
};

export default nextConfig;
