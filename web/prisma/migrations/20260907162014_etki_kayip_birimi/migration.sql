-- AlterTable
ALTER TABLE "EtkiDegerlendirmesi" ADD COLUMN "kayipBirim" TEXT;

-- MEVCUT SATIRLARIN BİRİMİ: bugüne kadar ekran "MW" yazıyordu ve veri
-- referans kiracıya (enerji) ait. Kayıtlara o birimi yazmak bir varsayım
-- DEĞİL, ekranda görünenin kayda geçirilmesidir. Değeri olmayan satıra
-- birim yazılmaz: birim, ölçülmüş bir değerin niteliğidir.
UPDATE "EtkiDegerlendirmesi" SET "kayipBirim" = 'MW' WHERE "uretimKaybiMw" IS NOT NULL;
