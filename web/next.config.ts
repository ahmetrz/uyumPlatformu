import type { NextConfig } from 'next';
import path from 'node:path';

// DEMO=1: GitHub Pages için statik dışa aktarım. Yazma eylemleri
// lib/eylemler.demo.ts'e alias'lanır (statik dışa aktarım server action taşıyamaz).
const demo = process.env.NEXT_PUBLIC_DEMO === '1';

const nextConfig: NextConfig = {
  ...(demo
    ? {
        output: 'export' as const,
        basePath: '/uyumPlatformu',
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  webpack: (config) => {
    if (demo) {
      config.resolve.alias['@/lib/eylemler'] =
        path.resolve(__dirname, 'lib/eylemler.demo.ts');
      config.resolve.alias['@/lib/girisEylemleri'] =
        path.resolve(__dirname, 'lib/girisEylemleri.demo.ts');
    }
    return config;
  },
  turbopack: {
    resolveAlias: demo
      ? {
          '@/lib/eylemler': './lib/eylemler.demo.ts',
          '@/lib/girisEylemleri': './lib/girisEylemleri.demo.ts',
        }
      : {},
  },
};

export default nextConfig;
