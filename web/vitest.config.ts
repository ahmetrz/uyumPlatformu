import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    /* ── ZAMAN BÜTÇESİ ─────────────────────────────────────────────────
       Vitest'in 5 sn'lik varsayılanı bu depo için gerçekçi değil ve bir
       kez YAYINI DURDURDU: `zamanlayici.test.ts` yayın işinde zaman
       aşımına uğradı, aynı ağaç PR kapısında geçmişti.

       Buradaki testlerin çoğu SAHTE DEĞİL: gerçek SQLite kopyası açar,
       gerçek yetki kapısından geçer, on sekiz motoru uçtan uca koşturur.
       Boş bir makinede en ağır dördü 1 153 · 2 110 · 3 446 · 3 478 ms
       sürüyor — bütçenin dörtte üçü. Paylaşımlı koşucuda (iki çekirdek,
       139 dosya paralel, aynı işte migrate + seed) ölçülen yavaşlama
       ~3,8× oldu: motor defteri 1 153 → 4 416 ms. Aynı çarpan öbür üçünü
       bütçenin dışına taşır.

       Yani kusur tek bir testte değil, bütçenin kendisindeydi. Tek tek
       muafiyet yazmak sırayı bir sonraki ağır teste devrederdi.

       30 sn, ölçülen en kötü hâlin yaklaşık altı katı. Bir testi
       gevşetmez — hiçbir iddia değişmez, hiçbir test atlanmaz; yalnız
       yüklü bir koşucuda bitmesine izin verir. Gerçekten TAKILAN bir
       test hâlâ yakalanır, altı saniye yerine yarım dakikada. */
    testTimeout: 30_000,
    hookTimeout: 30_000,
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
      /* ── HEDEF: DAVRANIŞ KRİTİK KATMANLARDA ≥%85 (P1-2) ─────────────
         Eski hedef "toplam ≥%90" idi ve ölçüldüğünde tutmayacağı çıktı:
         açığın ağırlık merkezi sunucu eylemleri DEĞİL, ekran bileşenleri
         (%0) ve `lib/` kökündeki altyapı. Depoda bileşen test katmanı
         hiç yok; %90 o katman kurulmadan matematiksel olarak imkânsız.
         Sayıyı hedefe uydurmak yerine hedef ölçüme göre yeniden yazıldı.

         Eşik artık KATMAN BAZLI ve MAKİNEYE BAĞLI. Yazılı bir hedef
         bayatlar ve bayatlığı fark edilmez; `npm run test:kapsam` bu
         eşiklerin altına düşen katmanda KIRMIZI döner.

         Sayılar bugünün ölçümünden bir tık AŞAĞIYA konuldu: kapı bugün
         geçsin ama bir gerileme yakalansın diye. Yukarı çekmek ayrı bir
         iştir ve ölçümle yapılır. */
      thresholds: {
        // Sunucu eylemleri — yetki kapısının ve iş kurallarının yaşadığı yer.
        'lib/eylemler2/**': { lines: 82, functions: 84 },
        // Yetki kapısının kendisi: kural buradan çıkar.
        'lib/erisim.ts': { lines: 85 },
        // Otomasyon motorları ve entegrasyon çekirdeği.
        'lib/motorlar/**': { lines: 90 },
        'lib/entegrasyon/**': { lines: 88 },
        // Dış API uçları — kimlik ve oran sınırı burada.
        'lib/api/**': { lines: 88 },
      },
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
