-- P1 · Kurulu güç kolonu düşürüldü (URN-ALN-001)
--
-- Değer taşıma bir önceki göçte (20260906230000) yapıldı. Kolonu düşürmek
-- GERİ ALINAMAZ olduğu için taşıma burada BİR KEZ DAHA, aynı deterministik
-- id ile çalıştırılır: `INSERT OR IGNORE` taşınmış satırı yok sayar, atlanmış
-- bir satır varsa kurtarır. Böylece "önceki göç koştu" varsayımına
-- güvenmek yerine kolon, değeri kesinlikle bir satırda duruyorken düşer.
--
-- Ölçülmemiş değer satır ALMAZ (WHERE ... IS NOT NULL): "bilinmeyen ≠ sıfır".

INSERT OR IGNORE INTO "TesisOzellik" ("id","tesisId","anahtar","sayisalDeger","birim","kaynak","olcumZamani","guncellendi")
SELECT 'p1_' || "id" || '_kuruluGucMw', "id", 'kuruluGucMw', "kuruluGucMw", 'MW', 'goc:P1', NULL, CURRENT_TIMESTAMP
FROM "Tesis" WHERE "kuruluGucMw" IS NOT NULL;

INSERT OR IGNORE INTO "BirimOzellik" ("id","birimId","anahtar","sayisalDeger","birim","kaynak","olcumZamani","guncellendi")
SELECT 'p1_' || "id" || '_kuruluGucMw', "id", 'kuruluGucMw', "kuruluGucMw", 'MW', 'goc:P1', NULL, CURRENT_TIMESTAMP
FROM "UretimUnitesi" WHERE "kuruluGucMw" IS NOT NULL;


-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tesis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tipId" TEXT,
    "konum" TEXT,
    "enlem" REAL,
    "boylam" REAL,
    "konumKaynagi" TEXT,
    "konumDogrulandi" BOOLEAN NOT NULL DEFAULT false,
    "konumDogrulayanId" TEXT,
    "konumDogrulandiZaman" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    "devreyeGiris" DATETIME,
    "kapanisTarihi" DATETIME,
    "kapanisNedeni" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gorselAnahtari" TEXT,
    "tuzelKisiId" TEXT,
    CONSTRAINT "Tesis_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "TesisTipi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tesis_tuzelKisiId_fkey" FOREIGN KEY ("tuzelKisiId") REFERENCES "TuzelKisi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tesis_konumDogrulayanId_fkey" FOREIGN KEY ("konumDogrulayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tesis" ("ad", "boylam", "devreyeGiris", "durum", "enlem", "gorselAnahtari", "id", "kapanisNedeni", "kapanisTarihi", "kod", "konum", "konumDogrulandi", "konumDogrulandiZaman", "konumDogrulayanId", "konumKaynagi", "olusturuldu", "tipId", "tuzelKisiId") SELECT "ad", "boylam", "devreyeGiris", "durum", "enlem", "gorselAnahtari", "id", "kapanisNedeni", "kapanisTarihi", "kod", "konum", "konumDogrulandi", "konumDogrulandiZaman", "konumDogrulayanId", "konumKaynagi", "olusturuldu", "tipId", "tuzelKisiId" FROM "Tesis";
DROP TABLE "Tesis";
ALTER TABLE "new_Tesis" RENAME TO "Tesis";
CREATE UNIQUE INDEX "Tesis_kod_key" ON "Tesis"("kod");
CREATE TABLE "new_UretimUnitesi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tesisId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "devreyeGiris" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    CONSTRAINT "UretimUnitesi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UretimUnitesi" ("ad", "devreyeGiris", "durum", "id", "kod", "tesisId") SELECT "ad", "devreyeGiris", "durum", "id", "kod", "tesisId" FROM "UretimUnitesi";
DROP TABLE "UretimUnitesi";
ALTER TABLE "new_UretimUnitesi" RENAME TO "UretimUnitesi";
CREATE UNIQUE INDEX "UretimUnitesi_tesisId_kod_key" ON "UretimUnitesi"("tesisId", "kod");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

