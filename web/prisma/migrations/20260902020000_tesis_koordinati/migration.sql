-- A4 harita — santralin kesin coğrafi konumu (WGS84).
--
-- NEDEN NULLABLE VE NEDEN SEED'DE BOŞ: elimizde doğrulanmış koordinat
-- yok. Uydurulmuş bir enlem/boylam haritada "kesin" görünür ve saha
-- ekibini yanlış noktaya götürür; boş bir alan ise kendini söyler.
-- Harita, koordinatı olmayan santrali ilinin merkezine YAKLAŞIK koyar ve
-- işaretin yaklaşık olduğunu ekranda yazar (bkz. app/(tam)/harita/mantik.ts
-- → IL_MERKEZI). Kesin konum ekrandan girilir ve iz bırakır.
--
-- Birim: ondalık derece, WGS84. Enlem -90..90, boylam -180..180 —
-- doğrulama uygulama katmanında (`lib/eylemler2/konum.ts`), çünkü SQLite
-- CHECK kısıtı Prisma şemasından türetilemez ve iki yerde tekrarlanırdı.

-- AlterTable
ALTER TABLE "Tesis" ADD COLUMN "boylam" REAL;
ALTER TABLE "Tesis" ADD COLUMN "enlem" REAL;
