-- P7 (docs/POSTGRES_READINESS.md §c) — bir regülasyonda YALNIZ BİR aktif sürüm.
--
-- Neden ham SQL: bu KISMİ (partial) tekil indekstir; Prisma şeması `@@unique`
-- üzerinden `WHERE` yazamaz. Kısıt uygulama katmanında değil VERİTABANINDA
-- durur, çünkü `surumAktiflestir` "eskiyi arşivle + yeniyi aktifleştir"
-- kalıbıyla çalışır ve eşzamanlı iki aktifleştirme iki aktif sürüm bırakabilir;
-- o durumda `lib/arama.ts` ve `app/(atlas)/uyum/veri.ts` gibi "aktif sürüm"
-- filtreleri sonuçları İKİ KAT döndürür.
--
-- Arşiv/taslak sürümler indekse girmez: bir regülasyonun geçmişinde istenildiği
-- kadar 'arsiv' sürüm olabilir, tekillik yalnız 'aktif' satırlar arasındadır.
--
-- SQLite kısmi tekil indeksi destekler; PostgreSQL'de aynı ifade birebir
-- çalışır (bkz. POSTGRES_READINESS.md §c/P7).

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkSurumu_tekAktif" ON "FrameworkSurumu"("regulasyonId") WHERE "durum" = 'aktif';
