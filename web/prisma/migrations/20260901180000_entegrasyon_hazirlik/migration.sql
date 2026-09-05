-- Gerçek kurum sistemi bağlanmadan ÖNCE gereken yapı.
--
-- Dört başlık, hepsi additive (mevcut veri korunur):
--
-- 1. EslemeProfili — kaynak alanından hedef alana çevirinin SÜRÜMLÜ tanımı.
--    Gerçek sistem bağlandığında en çok vakit alan iş eşleme olacak ve
--    eşleme değişecek; eski içe aktarımın hangi kuralla yorumlandığı
--    kaybolursa denetimde "bu alan neden böyle" sorusunun yanıtı olmaz.
--
-- 2. ReddedilenKayit — dead-letter / inceleme kuyruğu. Reddedilen kayıt
--    bugüne kadar yalnız BİR SAYIYDI (EntegrasyonKosusu.reddedilen);
--    hangi kayıt, neden, ham hâli neydi kaybolduğu için kimse
--    düzeltemiyordu. "3 kayıt reddedildi" bir kusur raporu değil, bir
--    kusurun ilanıdır.
--
-- 3. Connector yapılandırması genişledi: ortam (gelistirme/test/uretim —
--    üretim OT ağına bakan bir kaydı test sanmak en kolay yapılan hata),
--    senkron kipi, yeniden deneme politikası, ardışık hata sayacı ve
--    sınırı (devre kesici), connector düzeyinde santral kapsamı, etkin
--    eşleme profili, son hata parmak izi.
--
-- 4. EntegrasyonKosusu: kuru koşu (dry-run) bayrağı ve özeti, hata
--    parmak izi, hata sınıfı (gecici/kalici — ikisini karıştırmak
--    "tekrar dene" düğmesini anlamsız yapar), korelasyon kimliği,
--    kullanılan eşleme profili sürümü.
--
-- VeriKokeni'ne eşleme profili sürümü ve ham kayıt özeti (SHA-256)
-- eklendi: "kaynak ne gönderdi" sorusu kanıtlanabilir kalsın.

-- AlterTable
ALTER TABLE "VeriKokeni" ADD COLUMN "eslemeProfilSurumu" INTEGER;
ALTER TABLE "VeriKokeni" ADD COLUMN "kayitOzeti" TEXT;

-- CreateTable
CREATE TABLE "EslemeProfili" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "connectorTipi" TEXT NOT NULL,
    "surum" INTEGER NOT NULL DEFAULT 1,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "kurallarJson" TEXT NOT NULL,
    "aciklama" TEXT,
    "olusturanId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EslemeProfili_olusturanId_fkey" FOREIGN KEY ("olusturanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReddedilenKayit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kosuId" TEXT,
    "connectorId" TEXT,
    "kaynakSistem" TEXT NOT NULL,
    "kaynakKayitId" TEXT,
    "asama" TEXT NOT NULL,
    "sebep" TEXT NOT NULL,
    "hamJson" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "inceleyenId" TEXT,
    "incelemeNotu" TEXT,
    "incelemeZamani" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReddedilenKayit_kosuId_fkey" FOREIGN KEY ("kosuId") REFERENCES "EntegrasyonKosusu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReddedilenKayit_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReddedilenKayit_inceleyenId_fkey" FOREIGN KEY ("inceleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Connector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "kaynakSistem" TEXT NOT NULL,
    "kimlikTipi" TEXT NOT NULL DEFAULT 'none',
    "yapilandirmaJson" TEXT,
    "sirReferansi" TEXT,
    "pollAralikDk" INTEGER,
    "ortam" TEXT NOT NULL DEFAULT 'gelistirme',
    "senkronKipi" TEXT NOT NULL DEFAULT 'delta',
    "maksDeneme" INTEGER,
    "geriCekilmeMs" INTEGER,
    "ardisikHataSiniri" INTEGER,
    "ardisikHata" INTEGER NOT NULL DEFAULT 0,
    "kapsamTesisleriJson" TEXT,
    "eslemeProfilId" TEXT,
    "sonBasariliKosu" DATETIME,
    "sonHata" TEXT,
    "sonHataOzeti" TEXT,
    "etkin" BOOLEAN NOT NULL DEFAULT false,
    "imlec" TEXT,
    "silindi" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "Connector_eslemeProfilId_fkey" FOREIGN KEY ("eslemeProfilId") REFERENCES "EslemeProfili" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Connector" ("ad", "durum", "etkin", "guncellendi", "id", "imlec", "kaynakSistem", "kimlikTipi", "kod", "olusturuldu", "pollAralikDk", "silindi", "sirReferansi", "sonBasariliKosu", "sonHata", "tip", "yapilandirmaJson") SELECT "ad", "durum", "etkin", "guncellendi", "id", "imlec", "kaynakSistem", "kimlikTipi", "kod", "olusturuldu", "pollAralikDk", "silindi", "sirReferansi", "sonBasariliKosu", "sonHata", "tip", "yapilandirmaJson" FROM "Connector";
DROP TABLE "Connector";
ALTER TABLE "new_Connector" RENAME TO "Connector";
CREATE UNIQUE INDEX "Connector_kod_key" ON "Connector"("kod");
CREATE INDEX "Connector_tip_etkin_idx" ON "Connector"("tip", "etkin");
CREATE TABLE "new_EntegrasyonKosusu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynak" TEXT NOT NULL,
    "baslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'calisiyor',
    "kayitSayisi" INTEGER NOT NULL DEFAULT 0,
    "guvenEtiketi" TEXT NOT NULL DEFAULT 'manuel',
    "hata" TEXT,
    "ayrinti" TEXT,
    "connectorId" TEXT,
    "tetikleyen" TEXT NOT NULL DEFAULT 'manuel',
    "alinan" INTEGER NOT NULL DEFAULT 0,
    "kabulEdilen" INTEGER NOT NULL DEFAULT 0,
    "reddedilen" INTEGER NOT NULL DEFAULT 0,
    "yinelenen" INTEGER NOT NULL DEFAULT 0,
    "sureMs" INTEGER,
    "denemeNo" INTEGER NOT NULL DEFAULT 1,
    "imlecOnce" TEXT,
    "imlecSonra" TEXT,
    "kuruKosu" BOOLEAN NOT NULL DEFAULT false,
    "kuruOzetJson" TEXT,
    "hataOzeti" TEXT,
    "hataSinifi" TEXT,
    "korelasyonId" TEXT,
    "eslemeProfilSurumu" INTEGER,
    CONSTRAINT "EntegrasyonKosusu_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EntegrasyonKosusu" ("alinan", "ayrinti", "baslangic", "bitis", "connectorId", "denemeNo", "durum", "guvenEtiketi", "hata", "id", "imlecOnce", "imlecSonra", "kabulEdilen", "kayitSayisi", "kaynak", "reddedilen", "sureMs", "tetikleyen", "yinelenen") SELECT "alinan", "ayrinti", "baslangic", "bitis", "connectorId", "denemeNo", "durum", "guvenEtiketi", "hata", "id", "imlecOnce", "imlecSonra", "kabulEdilen", "kayitSayisi", "kaynak", "reddedilen", "sureMs", "tetikleyen", "yinelenen" FROM "EntegrasyonKosusu";
DROP TABLE "EntegrasyonKosusu";
ALTER TABLE "new_EntegrasyonKosusu" RENAME TO "EntegrasyonKosusu";
CREATE INDEX "EntegrasyonKosusu_connectorId_baslangic_idx" ON "EntegrasyonKosusu"("connectorId", "baslangic");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EslemeProfili_connectorTipi_durum_idx" ON "EslemeProfili"("connectorTipi", "durum");

-- CreateIndex
CREATE UNIQUE INDEX "EslemeProfili_kod_surum_key" ON "EslemeProfili"("kod", "surum");

-- CreateIndex
CREATE INDEX "ReddedilenKayit_durum_olusturuldu_idx" ON "ReddedilenKayit"("durum", "olusturuldu");

-- CreateIndex
CREATE INDEX "ReddedilenKayit_connectorId_asama_idx" ON "ReddedilenKayit"("connectorId", "asama");

