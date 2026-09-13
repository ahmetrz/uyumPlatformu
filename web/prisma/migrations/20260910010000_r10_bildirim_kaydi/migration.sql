-- R10 · OLAY → MEVZUAT BİLDİRİMİ (OLY-BIL)
--
-- İKİ DEĞİŞİKLİK:
--
-- 1) `BildirimYukumlulugu.sureSaat` NOT NULL → NULLABLE.
--    Mevzuat her zaman bir saat vermez: 7545 md. 7 "gecikmeksizin" der ve
--    saati ikincil düzenleme belirleyecektir. Bugüne kadar sütun NOT NULL
--    olduğu için böyle bir yükümlülük SATIR AÇAMIYORDU — yani ürün, süresi
--    belirsiz bir yükümlülüğü hiç tanımıyordu. Daralma değil GENİŞLEME:
--    mevcut satırların hepsi dolu kalır, veri kaybı yoktur.
--    `null` ≠ 0: sıfır "süre hemen doldu" demektir, null "geçecek süre yok".
--
-- 2) `BildirimKaydi` tablosu: her (olay, yükümlülük) çifti için AYRI kayıt.
--    Bir olay birden çok mercie bildirilir ve her birinin kendi süresi,
--    durumu ve referans numarası olur; `Olay.bildirimTarihi` tek hücresi
--    bunları birbirine karıştırıyordu. Tekil kısıt (`olayId`,
--    `yukumlulukId`) motorun her koşuda ikinci taslak açmasını engeller.
--
-- Motor bu tabloya yalnız `taslak` ve `suresi_gecti` yazabilir;
-- `gonderildi` · `teyit_alindi` · `uygulanmaz` insan kararıdır
-- (lib/uyum/bildirimKaydi.ts → MOTORUN_YAZABILECEGI).

-- CreateTable
CREATE TABLE "BildirimKaydi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "olayId" TEXT NOT NULL,
    "yukumlulukId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "sonTarih" DATETIME,
    "taslakMetin" TEXT,
    "gonderenId" TEXT,
    "gonderimZamani" DATETIME,
    "referansNo" TEXT,
    "kanitId" TEXT,
    "teyitZamani" DATETIME,
    "uygulanmazGerekcesi" TEXT,
    "acildi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "BildirimKaydi_olayId_fkey" FOREIGN KEY ("olayId") REFERENCES "Olay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BildirimKaydi_yukumlulukId_fkey" FOREIGN KEY ("yukumlulukId") REFERENCES "BildirimYukumlulugu" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BildirimKaydi_gonderenId_fkey" FOREIGN KEY ("gonderenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BildirimKaydi_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BildirimYukumlulugu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "regulasyonId" TEXT,
    "asgariSiddet" TEXT NOT NULL DEFAULT 'yuksek',
    "sureSaat" INTEGER,
    "dayanak" TEXT NOT NULL,
    "merci" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleyenId" TEXT,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "alanSablonuJson" TEXT,
    "kanalNotu" TEXT,
    CONSTRAINT "BildirimYukumlulugu_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BildirimYukumlulugu_guncelleyenId_fkey" FOREIGN KEY ("guncelleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BildirimYukumlulugu" ("ad", "aktif", "asgariSiddet", "dayanak", "guncelleyenId", "id", "kod", "koken", "merci", "olusturuldu", "paketSurumId", "regulasyonId", "sureSaat") SELECT "ad", "aktif", "asgariSiddet", "dayanak", "guncelleyenId", "id", "kod", "koken", "merci", "olusturuldu", "paketSurumId", "regulasyonId", "sureSaat" FROM "BildirimYukumlulugu";
DROP TABLE "BildirimYukumlulugu";
ALTER TABLE "new_BildirimYukumlulugu" RENAME TO "BildirimYukumlulugu";
CREATE UNIQUE INDEX "BildirimYukumlulugu_kod_key" ON "BildirimYukumlulugu"("kod");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BildirimKaydi_durum_idx" ON "BildirimKaydi"("durum");

-- CreateIndex
CREATE INDEX "BildirimKaydi_sonTarih_idx" ON "BildirimKaydi"("sonTarih");

-- CreateIndex
CREATE UNIQUE INDEX "BildirimKaydi_olayId_yukumlulukId_key" ON "BildirimKaydi"("olayId", "yukumlulukId");

