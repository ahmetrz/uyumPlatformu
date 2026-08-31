import type { NextConfig } from 'next';
import path from 'node:path';

// DEMO=1: GitHub Pages için statik dışa aktarım. Yazma eylemleri
// lib/eylemler.demo.ts'e alias'lanır (statik dışa aktarım server action taşıyamaz).
const demo = process.env.NEXT_PUBLIC_DEMO === '1';

const nextConfig: NextConfig = {
  // API route dosyaları `route.api.ts` adını taşır. Demo (statik dışa aktarım)
  // derlemesinde 'api.ts' uzantısı pageExtensions'ta YOKTUR; böylece Next
  // bu dosyaları route saymaz ve POST/Request'e bağlı uçlar demo yayınına
  // hiç girmez (statik dışa aktarım yalnız GET + force-static kaldırır).
  pageExtensions: demo
    ? ['tsx', 'ts', 'jsx', 'js']
    : ['tsx', 'ts', 'jsx', 'js', 'api.ts'],
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
      config.resolve.alias['@/lib/eylemler2/kimlik'] =
        path.resolve(__dirname, 'lib/eylemler2/kimlik.demo.ts');
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
      config.resolve.alias['@/lib/eylemler2/apiAnahtari'] =
        path.resolve(__dirname, 'lib/eylemler2/apiAnahtari.demo.ts');
      config.resolve.alias['@/lib/eylemler2/entegrasyon'] =
        path.resolve(__dirname, 'lib/eylemler2/entegrasyon.demo.ts');
      config.resolve.alias['@/lib/eylemler2/kesif'] =
        path.resolve(__dirname, 'lib/eylemler2/kesif.demo.ts');
      config.resolve.alias['@/lib/eylemler2/koken'] =
        path.resolve(__dirname, 'lib/eylemler2/koken.demo.ts');
      config.resolve.alias['@/lib/eylemler2/konfigYedek'] =
        path.resolve(__dirname, 'lib/eylemler2/konfigYedek.demo.ts');
      config.resolve.alias['@/lib/eylemler2/olay'] =
        path.resolve(__dirname, 'lib/eylemler2/olay.demo.ts');
      config.resolve.alias['@/lib/eylemler2/topoloji'] =
        path.resolve(__dirname, 'lib/eylemler2/topoloji.demo.ts');
      config.resolve.alias['@/lib/eylemler2/varlikAktarim'] =
        path.resolve(__dirname, 'lib/eylemler2/varlikAktarim.demo.ts');
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
          '@/lib/eylemler2/kimlik': './lib/eylemler2/kimlik.demo.ts',
          '@/lib/eylemler2/istisna': './lib/eylemler2/istisna.demo.ts',
          '@/lib/eylemler2/isler': './lib/eylemler2/isler.demo.ts',
          '@/lib/eylemler2/operasyon': './lib/eylemler2/operasyon.demo.ts',
          '@/lib/eylemler2/risk': './lib/eylemler2/risk.demo.ts',
          '@/lib/eylemler2/surum': './lib/eylemler2/surum.demo.ts',
          '@/lib/eylemler2/tesis360': './lib/eylemler2/tesis360.demo.ts',
          '@/lib/eylemler2/apiAnahtari': './lib/eylemler2/apiAnahtari.demo.ts',
          '@/lib/eylemler2/entegrasyon': './lib/eylemler2/entegrasyon.demo.ts',
          '@/lib/eylemler2/kesif': './lib/eylemler2/kesif.demo.ts',
          '@/lib/eylemler2/koken': './lib/eylemler2/koken.demo.ts',
          '@/lib/eylemler2/konfigYedek': './lib/eylemler2/konfigYedek.demo.ts',
          '@/lib/eylemler2/olay': './lib/eylemler2/olay.demo.ts',
          '@/lib/eylemler2/topoloji': './lib/eylemler2/topoloji.demo.ts',
          '@/lib/eylemler2/varlikAktarim': './lib/eylemler2/varlikAktarim.demo.ts',
        }
      : {},
  },
};

export default nextConfig;
