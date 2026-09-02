import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    /* Kapsam ölçümü (`npm run test:kapsam`) — sağlayıcı V8, araçsız.
       Kapsama giren şey ÜRÜN KODUDUR: iş kuralları (`lib/`), ekranların
       saf mantık/ortak modülleri ve kabuk bileşenleri. Rota giriş
       noktaları (page/layout), tip dosyaları, demo ikizleri ve üretilen
       Prisma istemcisi ölçüme girmez — sayıyı şişirmek ya da düşürmek
       için değil, "testle korunan mantık ne kadar" sorusuna dürüst cevap
       için. `json-summary` raporu CI/rapor için makine okunur özettir. */
    coverage: {
      provider: 'v8',
      include: ['lib/**', 'app/**/mantik.ts', 'app/**/ortak.ts', 'components/**'],
      exclude: [
        'lib/prisma-client/**',
        '**/*.d.ts',
        '**/*.demo.ts',
      ],
      reporter: ['text', 'json-summary'],
      /* Bir test kırıksa da rapor yazılsın: kapsam sayısı testin
         sonucundan bağımsız bir ölçüdür, kırık testin arkasına saklanmaz. */
      reportOnFailure: true,
      reportsDirectory: 'coverage',
    },
  },
  resolve: {
    alias: [
      { find: 'server-only', replacement: path.resolve(__dirname, 'tests/sahte/server-only.ts') },
      { find: 'next/navigation', replacement: path.resolve(__dirname, 'tests/sahte/next-navigation.ts') },
      { find: 'next/headers', replacement: path.resolve(__dirname, 'tests/sahte/next-headers.ts') },
      { find: 'next/cache', replacement: path.resolve(__dirname, 'tests/sahte/next-cache.ts') },
      // hem '@/lib/db' hem göreli '../db' / './db' importları test ikizine gider
      { find: '@/lib/db', replacement: path.resolve(__dirname, 'tests/sahte/db.ts') },
      { find: /^(\.\.?\/)+db$/, replacement: path.resolve(__dirname, 'tests/sahte/db.ts') },
      { find: '@', replacement: path.resolve(__dirname) },
    ],
  },
});
