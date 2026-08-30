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
      config.resolve.alias['@/lib/eylemler2/arama'] =
        path.resolve(__dirname, 'lib/eylemler2/arama.demo.ts');
      config.resolve.alias['@/lib/eylemler2/bildirim'] =
        path.resolve(__dirname, 'lib/eylemler2/bildirim.demo.ts');
      config.resolve.alias['@/lib/eylemler2/denetim'] =
        path.resolve(__dirname, 'lib/eylemler2/denetim.demo.ts');
      config.resolve.alias['@/lib/eylemler2/envanter'] =
        path.resolve(__dirname, 'lib/eylemler2/envanter.demo.ts');
      config.resolve.alias['@/lib/eylemler2/gorev'] =
        path.resolve(__dirname, 'lib/eylemler2/gorev.demo.ts');
      config.resolve.alias['@/lib/eylemler2/istisna'] =
        path.resolve(__dirname, 'lib/eylemler2/istisna.demo.ts');
      config.resolve.alias['@/lib/eylemler2/isler'] =
        path.resolve(__dirname, 'lib/eylemler2/isler.demo.ts');
      config.resolve.alias['@/lib/eylemler2/operasyon'] =
        path.resolve(__dirname, 'lib/eylemler2/operasyon.demo.ts');
      config.resolve.alias['@/lib/eylemler2/risk'] =
        path.resolve(__dirname, 'lib/eylemler2/risk.demo.ts');
      config.resolve.alias['@/lib/eylemler2/surum'] =
        path.resolve(__dirname, 'lib/eylemler2/surum.demo.ts');
      config.resolve.alias['@/lib/eylemler2/tesis360'] =
        path.resolve(__dirname, 'lib/eylemler2/tesis360.demo.ts');
    }
    return config;
  },
  turbopack: {
    resolveAlias: demo
      ? {
          '@/lib/eylemler': './lib/eylemler.demo.ts',
          '@/lib/girisEylemleri': './lib/girisEylemleri.demo.ts',
          '@/lib/eylemler2/arama': './lib/eylemler2/arama.demo.ts',
          '@/lib/eylemler2/bildirim': './lib/eylemler2/bildirim.demo.ts',
          '@/lib/eylemler2/denetim': './lib/eylemler2/denetim.demo.ts',
          '@/lib/eylemler2/envanter': './lib/eylemler2/envanter.demo.ts',
          '@/lib/eylemler2/gorev': './lib/eylemler2/gorev.demo.ts',
          '@/lib/eylemler2/istisna': './lib/eylemler2/istisna.demo.ts',
          '@/lib/eylemler2/isler': './lib/eylemler2/isler.demo.ts',
          '@/lib/eylemler2/operasyon': './lib/eylemler2/operasyon.demo.ts',
          '@/lib/eylemler2/risk': './lib/eylemler2/risk.demo.ts',
          '@/lib/eylemler2/surum': './lib/eylemler2/surum.demo.ts',
          '@/lib/eylemler2/tesis360': './lib/eylemler2/tesis360.demo.ts',
        }
      : {},
  },
};

export default nextConfig;
