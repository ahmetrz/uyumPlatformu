-- CreateTable
CREATE TABLE "KanitSurumu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kanitId" TEXT NOT NULL,
    "surum" INTEGER NOT NULL,
    "dosyaHash" TEXT,
    "dosyaAdi" TEXT,
    "dosyaBoyut" INTEGER,
    "depoAnahtari" TEXT,
    "gerekce" TEXT NOT NULL,
    "yukleyenId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KanitSurumu_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KanitSurumu_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Kanit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "dosyaYolu" TEXT,
    "gecerlilikBaslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "yukleyenId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sahipId" TEXT,
    "kaynakSistem" TEXT,
    "kaynakUrl" TEXT,
    "dosyaHash" TEXT,
    "surum" INTEGER NOT NULL DEFAULT 1,
    "gecerliBitis" DATETIME,
    "toplanmaTarihi" DATETIME,
    "otomatik" BOOLEAN NOT NULL DEFAULT false,
    "gizlilik" TEXT NOT NULL DEFAULT 'kurumsal',
    "durum" TEXT NOT NULL DEFAULT 'gecerli',
    "dosyaAdi" TEXT,
    "dosyaTipi" TEXT,
    "dosyaBoyut" INTEGER,
    "depoAnahtari" TEXT,
    "depoSaglayici" TEXT,
    "silindi" DATETIME,
    "dokumanId" TEXT,
    CONSTRAINT "Kanit_dokumanId_fkey" FOREIGN KEY ("dokumanId") REFERENCES "Dokuman" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Kanit_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Kanit_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Kanit" ("ad", "dokumanId", "dosyaHash", "dosyaYolu", "gecerliBitis", "gecerlilikBaslangic", "gizlilik", "id", "kaynakSistem", "kaynakUrl", "olusturuldu", "otomatik", "sahipId", "silindi", "surum", "tip", "toplanmaTarihi", "yukleyenId") SELECT "ad", "dokumanId", "dosyaHash", "dosyaYolu", "gecerliBitis", "gecerlilikBaslangic", "gizlilik", "id", "kaynakSistem", "kaynakUrl", "olusturuldu", "otomatik", "sahipId", "silindi", "surum", "tip", "toplanmaTarihi", "yukleyenId" FROM "Kanit";
DROP TABLE "Kanit";
ALTER TABLE "new_Kanit" RENAME TO "Kanit";
CREATE TABLE "new_MaddeDurumu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surecId" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'degerlendirilmedi',
    "guven" TEXT NOT NULL DEFAULT 'kanit_yok',
    "kanitBayat" BOOLEAN NOT NULL DEFAULT false,
    "sorumluId" TEXT,
    "ekipId" TEXT,
    "dogrulayanId" TEXT,
    "dogrulamaZamani" DATETIME,
    "not" TEXT,
    "sonDegerlendirme" DATETIME,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "MaddeDurumu_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_ekipId_fkey" FOREIGN KEY ("ekipId") REFERENCES "Ekip" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_dogrulayanId_fkey" FOREIGN KEY ("dogrulayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MaddeDurumu" ("durum", "guncellendi", "guven", "id", "kanitBayat", "maddeId", "not", "sonDegerlendirme", "sorumluId", "surecId", "tesisId") SELECT "durum", "guncellendi", "guven", "id", "kanitBayat", "maddeId", "not", "sonDegerlendirme", "sorumluId", "surecId", "tesisId" FROM "MaddeDurumu";
DROP TABLE "MaddeDurumu";
ALTER TABLE "new_MaddeDurumu" RENAME TO "MaddeDurumu";
CREATE INDEX "MaddeDurumu_surecId_tesisId_durum_idx" ON "MaddeDurumu"("surecId", "tesisId", "durum");
CREATE UNIQUE INDEX "MaddeDurumu_surecId_maddeId_tesisId_key" ON "MaddeDurumu"("surecId", "maddeId", "tesisId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "KanitSurumu_kanitId_idx" ON "KanitSurumu"("kanitId");

-- CreateIndex
CREATE UNIQUE INDEX "KanitSurumu_kanitId_surum_key" ON "KanitSurumu"("kanitId", "surum");

-- UY-12 · Kanıt sürüm geçmişi DEĞİŞMEZDİR.
--
-- Belge yorumunda "asla güncellenmez ve silinmez" yazmak yetmez: bir kural
-- yalnız yorumda duruyorsa, onu ihlal eden ilk kod satırı sessizce geçer.
-- `DegerlendirmeTarihcesi` ve `AktiviteKaydi` ile AYNI koruma uygulanır ve
-- koruma veritabanındadır — uygulama katmanı atlanabilir, tetikleyici
-- atlanamaz.
CREATE TRIGGER kanit_surumu_guncelleme_yasak
BEFORE UPDATE ON "KanitSurumu"
BEGIN
  SELECT RAISE(ABORT, 'Kanit surum gecmisi degistirilemez');
END;

CREATE TRIGGER kanit_surumu_silme_yasak
BEFORE DELETE ON "KanitSurumu"
BEGIN
  SELECT RAISE(ABORT, 'Kanit surum gecmisi silinemez');
END;
