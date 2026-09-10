-- R1 · MEVZUAT RADARI
--
-- "Güncel kalır" sözünün karşılığı. Üç tablo bir ZİNCİR kurar ve zincir
-- insanın önünde biter:
--
--   KAYNAK (nereye bakılır) → TARAMA (bakıldı mı, sonuç ne)
--                           → ADAY (insanın önüne konan öneri)
--
-- 1) `MevzuatKaynagi` — izlenecek KAMUYA AÇIK resmî yayın kanalı.
--    `etkin` VARSAYILAN OLARAK FALSE: ürün kurulur kurulmaz dışarı
--    çıkmaz, bir kaynağa istek göndermek kurulumun kendi kararıdır.
--    `durum = 'engelli'` kaynağın robots.txt ile izin vermediğini ya da
--    anti-bot yanıtı (403 · 418) döndüğünü söyler. BU DURUM ATLATILMAZ:
--    bir uyum ürününün bir kamu kurumunun erişim kuralını delmesi,
--    ürünün savunduğu şeyin tam tersi olurdu. Engelli kaynak ekranda
--    ADIYLA durur ve elle izleme yolu açık kalır.
--    `sonTarama`, kaynak başına GÜNDE BİR istek kuralının dayanağıdır.
--
-- 2) `MevzuatTaramasi` — bir koşum. `farkVar` NULLABLE ve üç değerlidir:
--       true  → değişiklik bulundu
--       false → bakıldı, değişiklik yok
--       NULL  → KARŞILAŞTIRILAMADI (engelli · ağ yok · biçim tanınmadı)
--    NULL'u false saymak, bakılamamış bir kaynağı "temiz" göstermek
--    olurdu; ürünün "bilinmeyen ≠ sıfır" kuralı burada bir kolon
--    tasarımına dönüşüyor. `sebep`, NULL'un neden NULL olduğunu yazar.
--
-- 3) `MevzuatDegisiklikAdayi` — motorun insanın önüne koyduğu öneri.
--    `@@unique(kaynakId, url)`: aynı kayıt ikinci koşuda yeniden aday
--    olmaz, yoksa her gün aynı değişiklik yeni bir satır açar ve kuyruk
--    kendi gürültüsünde boğulur. Aday HİÇBİR ŞEYİ DEĞİŞTİRMEZ — ne
--    regülasyonu, ne çerçeve sürümünü, ne kaynağı. `durum` insan
--    kararını taşır (`ilgisiz` de bir karardır ve gerekçesi yazılır).
--    `ozet` kaynağın kendi kısa özetidir; TELİFLİ TAM METİN GİRMEZ.
--
-- Üç tabloda da SİLME YOK: kaldırma bir durum değişikliğidir. Kaskat
-- silme yalnız KAYNAK silinirse çalışır ve kaynak silme bu turda hiçbir
-- eylemde YOKTUR (R-C ile aynı ilke: karar kaydı müşteri verisidir).

-- CreateTable
CREATE TABLE "MevzuatKaynagi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "yayinKanali" TEXT NOT NULL,
    "tur" TEXT NOT NULL DEFAULT 'liste',
    "dil" TEXT NOT NULL DEFAULT 'tr',
    "paketKodu" TEXT,
    "merci" TEXT,
    "etkin" BOOLEAN NOT NULL DEFAULT false,
    "durum" TEXT NOT NULL DEFAULT 'hazir',
    "durumNotu" TEXT,
    "sonTarama" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MevzuatTaramasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynakId" TEXT NOT NULL,
    "zaman" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "farkVar" BOOLEAN,
    "sebep" TEXT,
    "httpKodu" INTEGER,
    "adaySayisi" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MevzuatTaramasi_kaynakId_fkey" FOREIGN KEY ("kaynakId") REFERENCES "MevzuatKaynagi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MevzuatDegisiklikAdayi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynakId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "yayinTarihi" DATETIME,
    "ozet" TEXT,
    "bulundu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durum" TEXT NOT NULL DEFAULT 'yeni',
    "kararVerenId" TEXT,
    "kararZamani" DATETIME,
    "gerekce" TEXT,
    "surumId" TEXT,
    CONSTRAINT "MevzuatDegisiklikAdayi_kaynakId_fkey" FOREIGN KEY ("kaynakId") REFERENCES "MevzuatKaynagi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MevzuatKaynagi_kod_key" ON "MevzuatKaynagi"("kod");

-- CreateIndex
CREATE INDEX "MevzuatKaynagi_etkin_durum_idx" ON "MevzuatKaynagi"("etkin", "durum");

-- CreateIndex
CREATE INDEX "MevzuatTaramasi_kaynakId_zaman_idx" ON "MevzuatTaramasi"("kaynakId", "zaman");

-- CreateIndex
CREATE INDEX "MevzuatDegisiklikAdayi_durum_bulundu_idx" ON "MevzuatDegisiklikAdayi"("durum", "bulundu");

-- CreateIndex
CREATE UNIQUE INDEX "MevzuatDegisiklikAdayi_kaynakId_url_key" ON "MevzuatDegisiklikAdayi"("kaynakId", "url");

