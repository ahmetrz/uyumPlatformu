-- CreateTable
CREATE TABLE "Yapilandirma" (
    "anahtar" TEXT NOT NULL PRIMARY KEY,
    "degerJson" TEXT NOT NULL,
    "guncellendi" DATETIME NOT NULL,
    "guncelleyenId" TEXT
);

-- CreateTable
CREATE TABLE "DegisiklikTalebi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hedefTipi" TEXT NOT NULL,
    "hedefId" TEXT,
    "hedefEtiket" TEXT NOT NULL,
    "onceJson" TEXT,
    "sonraJson" TEXT NOT NULL,
    "etkiJson" TEXT,
    "gerekce" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "talepEdenId" TEXT NOT NULL,
    "inceleyenId" TEXT,
    "onaylayanId" TEXT,
    "uygulayanId" TEXT,
    "redNedeni" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incelendi" DATETIME,
    "onaylandi" DATETIME,
    "uygulandi" DATETIME
);

-- CreateIndex
CREATE INDEX "DegisiklikTalebi_durum_hedefTipi_idx" ON "DegisiklikTalebi"("durum", "hedefTipi");
