import type { NextConfig } from 'next';
import fs from 'node:fs';
import path from 'node:path';

const demo = process.env.NEXT_PUBLIC_DEMO === '1';

const YAYIN_KOKU = (() => {
  const kaynak = fs.readFileSync(path.join(__dirname, 'lib', 'demo.ts'), 'utf8');
  const m = /export const YAYIN_KOKU = '([^']+)'/.exec(kaynak);
  if (!m) throw new Error('lib/demo.ts içinde YAYIN_KOKU bulunamadı');
  return m[1];
})();

const EYLEM_DIZINI = path.join(__dirname, 'lib', 'eylemler2');

const KOK_EYLEMLER = ['lib/eylemler', 'lib/girisEylemleri'] as const;

function eylemModulleri(): string[] {
  
  const dosyalar = fs.readdirSync(EYLEM_DIZINI)
    .filter((d) => d.endsWith('.ts') && !d.endsWith('.demo.ts'))
    .filter((d) => /^\s*['"]use server['"]/m.test(
      fs.readFileSync(path.join(EYLEM_DIZINI, d), 'utf8')))
    .map((d) => d.slice(0, -3))
    .sort();

  const eksik = dosyalar.filter(
    (ad) => !fs.existsSync(path.join(EYLEM_DIZINI, `${ad}.demo.ts`)),
  );
  if (eksik.length > 0) {
    throw new Error(
      `lib/eylemler2/ altındaki şu modüllerin demo ikizi yok: ${eksik.join(', ')}. `
      + 'Her sunucu eylemi modülünün bir <ad>.demo.ts ikizi olmalıdır; '
      + 'yoksa statik demo derlemesi yayın anında patlar.',
    );
  }
  return dosyalar.map((ad) => `lib/eylemler2/${ad}`);
}

function demoEslemesi(): Record<string, string> {
  const hepsi = [...KOK_EYLEMLER, ...eylemModulleri()];
  return Object.fromEntries(hepsi.map((yol) => [`@/${yol}`, `./${yol}.demo.ts`]));
}

const GELISTIRME = process.env.NODE_ENV !== 'production';

const GUVENLIK_BASLIKLARI = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${GELISTIRME ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  
  devIndicators: { position: 'bottom-right' },
  pageExtensions: demo
    ? ['tsx', 'ts', 'jsx', 'js']
    : ['tsx', 'ts', 'jsx', 'js', 'api.ts'],
  ...(demo
    ? {
        output: 'export' as const,
        basePath: YAYIN_KOKU,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        async headers() {
          return [{ source: '/:path*', headers: GUVENLIK_BASLIKLARI }];
        },
      }),
  webpack: (config) => {
    if (demo) {
      for (const [istek, hedef] of Object.entries(demoEslemesi())) {
        config.resolve.alias[istek] = path.resolve(__dirname, hedef);
      }
    }
    return config;
  },
  turbopack: {
    resolveAlias: demo ? demoEslemesi() : {},
  },
};

export default nextConfig;
