-- CreateTable
CREATE TABLE "SektorOznitelikSemasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sektorId" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "etiketAnahtari" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'sayi',
    "birim" TEXT,
    "kuraldaKullanilir" BOOLEAN NOT NULL DEFAULT false,
    "sira" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SektorOznitelikSemasi_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SektorSozlugu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sektorId" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "dil" TEXT NOT NULL DEFAULT 'tr',
    "tekil" TEXT NOT NULL,
    "cogul" TEXT,
    "iyelik" TEXT,
    "belirtme" TEXT,
    CONSTRAINT "SektorSozlugu_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TesisOzellik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tesisId" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "sayisalDeger" REAL,
    "metinDeger" TEXT,
    "birim" TEXT,
    "kaynak" TEXT,
    "olcumZamani" DATETIME,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "TesisOzellik_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BirimOzellik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "birimId" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "sayisalDeger" REAL,
    "metinDeger" TEXT,
    "birim" TEXT,
    "kaynak" TEXT,
    "olcumZamani" DATETIME,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "BirimOzellik_birimId_fkey" FOREIGN KEY ("birimId") REFERENCES "UretimUnitesi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SektorOznitelikSemasi_sektorId_anahtar_key" ON "SektorOznitelikSemasi"("sektorId", "anahtar");

-- CreateIndex
CREATE UNIQUE INDEX "SektorSozlugu_sektorId_anahtar_dil_key" ON "SektorSozlugu"("sektorId", "anahtar", "dil");

-- CreateIndex
CREATE INDEX "TesisOzellik_anahtar_idx" ON "TesisOzellik"("anahtar");

-- CreateIndex
CREATE UNIQUE INDEX "TesisOzellik_tesisId_anahtar_key" ON "TesisOzellik"("tesisId", "anahtar");

-- CreateIndex
CREATE INDEX "BirimOzellik_anahtar_idx" ON "BirimOzellik"("anahtar");

-- CreateIndex
CREATE UNIQUE INDEX "BirimOzellik_birimId_anahtar_key" ON "BirimOzellik"("birimId", "anahtar");


-- ═══════════════════════════════════════════════════════════════════════
-- VERİ TAŞIMA — kurulu güç kolondan özniteliğe (P1 · URN-ALN-001)
--
-- Kolon bir SEKTÖR niteliğiydi; öznitelik satırına taşınıyor. Taşıma
-- yalnız DEĞERİ OLAN satırlar için yapılır: `kuruluGucMw IS NULL` olan
-- tesis (bugün `MERKEZ-BT`) öznitelik satırı ALMAZ. "Bilinmeyen ≠ sıfır"
-- kuralının buradaki karşılığı budur — boş bir satır "ölçüldü ve değeri
-- yok" demek olurdu, oysa ölçülmemiş.
--
-- `olcumZamani` NULL bırakılır: değerin ne zaman ölçüldüğü kayıtlı değil
-- ve göç anını ölçüm anı diye yazmak uydurma olurdu.
--
-- Kimlik `p1_<kaynakId>_<anahtar>`: göçle geldiği okunabilsin ve tekrar
-- koşulursa çakışsın (idempotent değil, ama sessizce ikizlemez).
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO "TesisOzellik" ("id", "tesisId", "anahtar", "sayisalDeger", "birim", "kaynak", "olcumZamani", "guncellendi")
SELECT 'p1_' || "id" || '_kuruluGucMw', "id", 'kuruluGucMw', "kuruluGucMw", 'MW', 'goc:P1', NULL, CURRENT_TIMESTAMP
FROM "Tesis"
WHERE "kuruluGucMw" IS NOT NULL;

INSERT INTO "BirimOzellik" ("id", "birimId", "anahtar", "sayisalDeger", "birim", "kaynak", "olcumZamani", "guncellendi")
SELECT 'p1_' || "id" || '_kuruluGucMw', "id", 'kuruluGucMw', "kuruluGucMw", 'MW', 'goc:P1', NULL, CURRENT_TIMESTAMP
FROM "UretimUnitesi"
WHERE "kuruluGucMw" IS NOT NULL;
