-- CreateTable
CREATE TABLE "EskalasyonKurali" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynakTipi" TEXT NOT NULL,
    "onemDerecesi" TEXT,
    "kademe" INTEGER NOT NULL,
    "gecikmeGun" INTEGER NOT NULL,
    "hedefTuru" TEXT NOT NULL,
    "hedefDeger" TEXT,
    "aciklama" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EskalasyonKaydi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kuralId" TEXT NOT NULL,
    "kaynakTipi" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "kademe" INTEGER NOT NULL,
    "bildirimId" TEXT,
    "hedefKullaniciId" TEXT,
    "sebep" TEXT,
    "zaman" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EskalasyonKaydi_kuralId_fkey" FOREIGN KEY ("kuralId") REFERENCES "EskalasyonKurali" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegulasyonKaynagi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regulasyonId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "adres" TEXT,
    "izlemeTuru" TEXT NOT NULL DEFAULT 'elle',
    "kontrolAraligiGun" INTEGER NOT NULL DEFAULT 90,
    "sonKontrol" DATETIME,
    "sonKontrolEdenId" TEXT,
    "sonNot" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegulasyonKaynagi_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegulasyonKaynagi_sonKontrolEdenId_fkey" FOREIGN KEY ("sonKontrolEdenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DegerlendirmeAktarimi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regulasyonId" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    "surecId" TEXT,
    "kaynakAdi" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'kuru_kosu',
    "okunan" INTEGER NOT NULL DEFAULT 0,
    "eslesen" INTEGER NOT NULL DEFAULT 0,
    "elenen" INTEGER NOT NULL DEFAULT 0,
    "degisen" INTEGER NOT NULL DEFAULT 0,
    "raporJson" TEXT,
    "kuruKosuId" TEXT,
    "yukleyenId" TEXT,
    "uygulandi" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DegerlendirmeAktarimi_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DegerlendirmeAktarimi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DegerlendirmeAktarimi_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DegerlendirmeAktarimi_kuruKosuId_fkey" FOREIGN KEY ("kuruKosuId") REFERENCES "DegerlendirmeAktarimi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DegerlendirmeAktarimi_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bulgu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maddeDurumuId" TEXT NOT NULL,
    "denetimId" TEXT,
    "kokNeden" TEXT,
    "kokNedenKategori" TEXT,
    "kokNedenAnalizEdenId" TEXT,
    "kokNedenAnalizZamani" DATETIME,
    "tekrarBulguId" TEXT,
    "tekrarKaynagi" TEXT,
    "tekrarPenceresiGun" INTEGER,
    "retestGerekli" BOOLEAN NOT NULL DEFAULT false,
    "retestSonucu" TEXT,
    "kapanisDogrulayanId" TEXT,
    "kapanisDogrulama" DATETIME,
    "silindi" DATETIME,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL,
    "onemDerecesi" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "kaynak" TEXT,
    "tespitTarihi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hedefTarih" DATETIME,
    "kapanmaTarihi" DATETIME,
    "sorumluId" TEXT,
    CONSTRAINT "Bulgu_maddeDurumuId_fkey" FOREIGN KEY ("maddeDurumuId") REFERENCES "MaddeDurumu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bulgu_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bulgu_denetimId_fkey" FOREIGN KEY ("denetimId") REFERENCES "Denetim" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bulgu_tekrarBulguId_fkey" FOREIGN KEY ("tekrarBulguId") REFERENCES "Bulgu" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bulgu_kapanisDogrulayanId_fkey" FOREIGN KEY ("kapanisDogrulayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bulgu_kokNedenAnalizEdenId_fkey" FOREIGN KEY ("kokNedenAnalizEdenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Bulgu" ("aciklama", "baslik", "denetimId", "durum", "hedefTarih", "id", "kapanisDogrulama", "kapanisDogrulayanId", "kapanmaTarihi", "kaynak", "kokNeden", "maddeDurumuId", "onemDerecesi", "retestGerekli", "retestSonucu", "silindi", "sorumluId", "tekrarBulguId", "tespitTarihi") SELECT "aciklama", "baslik", "denetimId", "durum", "hedefTarih", "id", "kapanisDogrulama", "kapanisDogrulayanId", "kapanmaTarihi", "kaynak", "kokNeden", "maddeDurumuId", "onemDerecesi", "retestGerekli", "retestSonucu", "silindi", "sorumluId", "tekrarBulguId", "tespitTarihi" FROM "Bulgu";
DROP TABLE "Bulgu";
ALTER TABLE "new_Bulgu" RENAME TO "Bulgu";
CREATE INDEX "Bulgu_durum_onemDerecesi_idx" ON "Bulgu"("durum", "onemDerecesi");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EskalasyonKurali_kaynakTipi_onemDerecesi_kademe_key" ON "EskalasyonKurali"("kaynakTipi", "onemDerecesi", "kademe");

-- CreateIndex
CREATE INDEX "EskalasyonKaydi_zaman_idx" ON "EskalasyonKaydi"("zaman");

-- CreateIndex
CREATE UNIQUE INDEX "EskalasyonKaydi_kaynakTipi_kaynakId_kademe_key" ON "EskalasyonKaydi"("kaynakTipi", "kaynakId", "kademe");

-- CreateIndex
CREATE UNIQUE INDEX "RegulasyonKaynagi_regulasyonId_ad_key" ON "RegulasyonKaynagi"("regulasyonId", "ad");

-- CreateIndex
CREATE INDEX "DegerlendirmeAktarimi_regulasyonId_tesisId_durum_idx" ON "DegerlendirmeAktarimi"("regulasyonId", "tesisId", "durum");
