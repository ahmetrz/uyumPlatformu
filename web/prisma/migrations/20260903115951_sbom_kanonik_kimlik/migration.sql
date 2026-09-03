/*
  Warnings:

  - Added the required column `kimlik` to the `YazilimBileseni` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_YazilimBileseni" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kimlik" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "surum" TEXT,
    "purl" TEXT,
    "cpe" TEXT,
    "tedarikci" TEXT,
    "lisans" TEXT,
    "ozet" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- `kimlik` GERİ DOLDURMASI DETERMİNİSTİKTİR ve `lib/varlik/sbom.ts`
-- içindeki `bilesenKimligi()` ile AYNI kuralı uygular:
--   purl varsa purl, yoksa `ad@surum` (sürüm yoksa boş).
-- İki kaynak ayrışırsa aynı bileşen iki satır açar; bu yüzden kural
-- SQL'de de kodda da tek cümledir.
INSERT INTO "new_YazilimBileseni" ("kimlik", "ad", "cpe", "id", "lisans", "olusturuldu", "ozet", "purl", "surum", "tedarikci")
SELECT COALESCE("purl", "ad" || '@' || COALESCE("surum", '')),
       "ad", "cpe", "id", "lisans", "olusturuldu", "ozet", "purl", "surum", "tedarikci"
FROM "YazilimBileseni";
DROP TABLE "YazilimBileseni";
ALTER TABLE "new_YazilimBileseni" RENAME TO "YazilimBileseni";
CREATE UNIQUE INDEX "YazilimBileseni_kimlik_key" ON "YazilimBileseni"("kimlik");
CREATE INDEX "YazilimBileseni_purl_idx" ON "YazilimBileseni"("purl");
CREATE INDEX "YazilimBileseni_ad_idx" ON "YazilimBileseni"("ad");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
