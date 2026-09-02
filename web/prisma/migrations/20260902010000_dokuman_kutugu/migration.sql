-- C22 politika · C23 doküman kütüğü — yönetişim belgesi kaydı.
--
-- NEDEN YENİ TABLO, `Kanit`e ALAN DEĞİL: kanıt bir ANIN ispatıdır ve
-- değişmez ("14 Mart'ta yedek şu ayardaydı"); belge YAŞAR — sürümü artar,
-- sahibi değişir, gözden geçirilir, yürürlükten kalkar. İkisini tek tabloda
-- tutmak "hangi sürüm kanıt olarak verildi" sorusunu cevapsız bırakırdı.
-- Bağ `Kanit.dokumanId` ile tek yönde kurulur; mevcut 10 politika kanıdı
-- seed'de kütükteki karşılığına bağlanır.
--
-- DOSYA SAKLANMAZ: `disKaynak` kurumun doküman sistemindeki yolu/URL'yi
-- taşır, ürün o adrese istek atmaz. Bu bilinçli sınır ekranda da yazılıdır.
--
-- `sonrakiGozdenGecirme` TÜRETİLMİŞ ama saklanır: "gözden geçirmesi geçmiş
-- belgeler" listesi indeksten okunsun, tüm kütük belleğe çekilmesin
-- (`Dokuman_durum_sonrakiGozdenGecirme_idx`).
--
-- Kanit tablosunun yeniden yazılması SQLite'ın kolon ekleme biçimidir;
-- satırlar INSERT ... SELECT ile birebir taşınır.

-- CreateTable
CREATE TABLE "Dokuman" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "surum" TEXT NOT NULL DEFAULT '1.0',
    "sahipId" TEXT,
    "onaylayanId" TEXT,
    "yururlukTarihi" DATETIME,
    "gozdenGecirmeAy" INTEGER,
    "sonGozdenGecirme" DATETIME,
    "sonrakiGozdenGecirme" DATETIME,
    "disKaynak" TEXT,
    "kaynakSistem" TEXT,
    "gizlilik" TEXT NOT NULL DEFAULT 'kurumsal',
    "aciklama" TEXT,
    "silindi" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "Dokuman_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Dokuman_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DokumanMadde" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dokumanId" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,
    "eklendi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DokumanMadde_dokumanId_fkey" FOREIGN KEY ("dokumanId") REFERENCES "Dokuman" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DokumanMadde_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DokumanTesis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dokumanId" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    CONSTRAINT "DokumanTesis_dokumanId_fkey" FOREIGN KEY ("dokumanId") REFERENCES "Dokuman" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DokumanTesis_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "silindi" DATETIME,
    "dokumanId" TEXT,
    CONSTRAINT "Kanit_dokumanId_fkey" FOREIGN KEY ("dokumanId") REFERENCES "Dokuman" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Kanit_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Kanit_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Kanit" ("ad", "dosyaHash", "dosyaYolu", "gecerliBitis", "gecerlilikBaslangic", "gizlilik", "id", "kaynakSistem", "kaynakUrl", "olusturuldu", "otomatik", "sahipId", "silindi", "surum", "tip", "toplanmaTarihi", "yukleyenId") SELECT "ad", "dosyaHash", "dosyaYolu", "gecerliBitis", "gecerlilikBaslangic", "gizlilik", "id", "kaynakSistem", "kaynakUrl", "olusturuldu", "otomatik", "sahipId", "silindi", "surum", "tip", "toplanmaTarihi", "yukleyenId" FROM "Kanit";
DROP TABLE "Kanit";
ALTER TABLE "new_Kanit" RENAME TO "Kanit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Dokuman_kod_key" ON "Dokuman"("kod");

-- CreateIndex
CREATE INDEX "Dokuman_durum_sonrakiGozdenGecirme_idx" ON "Dokuman"("durum", "sonrakiGozdenGecirme");

-- CreateIndex
CREATE INDEX "DokumanMadde_maddeId_idx" ON "DokumanMadde"("maddeId");

-- CreateIndex
CREATE UNIQUE INDEX "DokumanMadde_dokumanId_maddeId_key" ON "DokumanMadde"("dokumanId", "maddeId");

-- CreateIndex
CREATE UNIQUE INDEX "DokumanTesis_dokumanId_tesisId_key" ON "DokumanTesis"("dokumanId", "tesisId");

