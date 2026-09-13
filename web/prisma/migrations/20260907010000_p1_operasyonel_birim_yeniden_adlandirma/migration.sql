-- P1 · UretimUnitesi → OperasyonelBirim (URN-ALN-001, URN-ALN-006)
--
-- "Üretim ünitesi" bir ENERJİ terimidir; çekirdek şema sektör taşımaz.
-- Tablo YENİDEN ADLANDIRILIR, `@@map` ile eski ad TUTULMAZ: tek doğruluk
-- kaynağı kararı (`docs/GELISTIRME_PAKETLERI.md` P1 · Kararlar).
--
-- Yeniden adlandırma, tabloyu yeniden yaratmak yerine `RENAME` ile yapılır:
-- satırlar yerinde kalır, id'ler korunur, hiçbir kopyalama adımı yoktur.
-- SQLite başka tablolardaki REFERENCES cümlelerini bu sırada kendisi
-- günceller; göç uygulandıktan sonra `PRAGMA foreign_key_list` ile ölçüldü.

ALTER TABLE "UretimUnitesi" RENAME TO "OperasyonelBirim";

-- İndeks adı tabloyla birlikte taşınmaz; Prisma'nın beklediği ada çevrilir.
DROP INDEX "UretimUnitesi_tesisId_kod_key";
CREATE UNIQUE INDEX "OperasyonelBirim_tesisId_kod_key" ON "OperasyonelBirim"("tesisId", "kod");

-- Kolon adları: `unite` de sektör sözcüğüydü.
ALTER TABLE "SistemServis" RENAME COLUMN "uniteId" TO "birimId";
ALTER TABLE "Varlik" RENAME COLUMN "uniteId" TO "birimId";

-- AÇIK değişiklik talepleri canlı iş akışıdır, denetim izi DEĞİLDİR:
-- ayrımcı değeri güncellenmezse onaylanmış bir talep uygulanamaz hâle
-- gelir. `AktiviteKaydi` satırlarına DOKUNULMAZ — geçmiş iz değişmez;
-- konsol eski `UretimUnitesi` tipini okumayı sürdürür (konsolOrtak.ts).
UPDATE "DegisiklikTalebi" SET "hedefTipi" = 'operasyonelBirim'
WHERE "hedefTipi" = 'uretimUnitesi';
