-- CreateTable
CREATE TABLE "SaklamaPolitikasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varlikTipi" TEXT NOT NULL,
    "saklamaGun" INTEGER,
    "sureSonu" TEXT NOT NULL DEFAULT 'oner',
    "dayanak" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleyenId" TEXT,
    CONSTRAINT "SaklamaPolitikasi_guncelleyenId_fkey" FOREIGN KEY ("guncelleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LegalHold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "varlikTipi" TEXT NOT NULL,
    "varlikId" TEXT,
    "tesisId" TEXT,
    "gerekce" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    "koyanId" TEXT NOT NULL,
    "konuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kaldiranId" TEXT,
    "kaldirildi" DATETIME,
    "kaldirmaGerekcesi" TEXT,
    CONSTRAINT "LegalHold_koyanId_fkey" FOREIGN KEY ("koyanId") REFERENCES "Kullanici" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LegalHold_kaldiranId_fkey" FOREIGN KEY ("kaldiranId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LegalHold_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImhaKarari" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "politikaId" TEXT NOT NULL,
    "varlikTipi" TEXT NOT NULL,
    "kapsananSayi" INTEGER NOT NULL,
    "donemBaslangic" DATETIME,
    "donemBitis" DATETIME,
    "gerekce" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'oneri',
    "onerenId" TEXT NOT NULL,
    "onaylayanId" TEXT,
    "onaylandi" DATETIME,
    "uygulandi" DATETIME,
    "silinenSayi" INTEGER,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImhaKarari_politikaId_fkey" FOREIGN KEY ("politikaId") REFERENCES "SaklamaPolitikasi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImhaKarari_onerenId_fkey" FOREIGN KEY ("onerenId") REFERENCES "Kullanici" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImhaKarari_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DenetciErisimi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kullaniciId" TEXT NOT NULL,
    "denetimId" TEXT,
    "firma" TEXT NOT NULL,
    "baslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" DATETIME NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    "davetEdenId" TEXT NOT NULL,
    "iptalEdenId" TEXT,
    "iptalZamani" DATETIME,
    "iptalGerekcesi" TEXT,
    "sonErisim" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DenetciErisimi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DenetciErisimi_denetimId_fkey" FOREIGN KEY ("denetimId") REFERENCES "Denetim" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DenetciErisimi_davetEdenId_fkey" FOREIGN KEY ("davetEdenId") REFERENCES "Kullanici" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DenetciErisimi_iptalEdenId_fkey" FOREIGN KEY ("iptalEdenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DenetciKapsami" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "erisimId" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    CONSTRAINT "DenetciKapsami_erisimId_fkey" FOREIGN KEY ("erisimId") REFERENCES "DenetciErisimi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DenetciKapsami_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ApiAnahtari" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "onEk" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sonKullanim" DATETIME,
    "bitis" DATETIME,
    "iptalZamani" DATETIME,
    "kapsamJson" TEXT,
    "saltOkunur" BOOLEAN NOT NULL DEFAULT true,
    "olusturanId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiAnahtari_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApiAnahtari_olusturanId_fkey" FOREIGN KEY ("olusturanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ApiAnahtari" ("ad", "bitis", "id", "iptalZamani", "kullaniciId", "olusturanId", "olusturuldu", "onEk", "sonKullanim", "tokenHash") SELECT "ad", "bitis", "id", "iptalZamani", "kullaniciId", "olusturanId", "olusturuldu", "onEk", "sonKullanim", "tokenHash" FROM "ApiAnahtari";
DROP TABLE "ApiAnahtari";
ALTER TABLE "new_ApiAnahtari" RENAME TO "ApiAnahtari";
CREATE UNIQUE INDEX "ApiAnahtari_tokenHash_key" ON "ApiAnahtari"("tokenHash");
CREATE INDEX "ApiAnahtari_kullaniciId_idx" ON "ApiAnahtari"("kullaniciId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SaklamaPolitikasi_varlikTipi_key" ON "SaklamaPolitikasi"("varlikTipi");

-- CreateIndex
CREATE INDEX "LegalHold_varlikTipi_durum_idx" ON "LegalHold"("varlikTipi", "durum");

-- CreateIndex
CREATE INDEX "ImhaKarari_durum_varlikTipi_idx" ON "ImhaKarari"("durum", "varlikTipi");

-- CreateIndex
CREATE INDEX "DenetciErisimi_durum_bitis_idx" ON "DenetciErisimi"("durum", "bitis");

-- CreateIndex
CREATE UNIQUE INDEX "DenetciKapsami_erisimId_tesisId_key" ON "DenetciKapsami"("erisimId", "tesisId");

-- ════════════════════════════════════════════════════════════════════
-- UY-52 · MEVCUT ANAHTARLARIN DAVRANIŞI KORUNUR
--
-- `saltOkunur` şema varsayılanı `true`dur ve bu YENİ anahtarlar için
-- doğrudur: varsayılan kapalı. Ama bu göç mevcut satırlara da `true`
-- yazsaydı, bugün yazma yapan bir entegrasyon yarın sessizce 403
-- alırdı — bir göçün yapabileceği en kötü şey, çalışan bir bağlantıyı
-- kimse fark etmeden kesmektir.
--
-- Mevcut anahtarlar bu yüzden `saltOkunur = 0` ile taşınır ve
-- `kapsamJson` NULL kalır. NULL kapsam "eski kayıt" demektir: anahtar
-- sahibinin bütün yetkilerini miras alır ve ekran bunu KUSUR olarak
-- gösterir. Kurum her anahtara kapsam tanımlayana kadar boşluk
-- görünür kalır; gizlenmez.
UPDATE "ApiAnahtari" SET "saltOkunur" = 0 WHERE "kapsamJson" IS NULL;
