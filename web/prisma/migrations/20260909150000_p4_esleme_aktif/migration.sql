-- P4 · 2.4 — EŞLEME SATIRINDA AKTİF BAYRAĞI
--
-- NİÇİN: eşleme CSV türü paketle geliyor (`esleme/<KOD>.json` + CSV,
-- MaddeEslestirmesi koken=paket). Paket yükseltmesinin bıraktığı ve
-- kaldırmanın pasiflediği eşleme SİLİNMEZ (R-C, tavan sıfır) — `aktif=false`
-- olur; okuyucular ve `madde.eslestirme*` içermeleri yalnız aktif satırı
-- görür (bekçi `tests/bekci/aktif-suzgec.test.ts`). 2.1'deki sözlük /
-- öznitelik kalıbıyla aynı.
--
-- ELLE EKLEMELİ (ADD COLUMN). Ölçüldü: `prisma migrate diff` bu tablo için
-- RedefineTables (tabloyu düşürüp yeniden kurma) üretti — yabancı anahtarlı
-- SQLite tablosunda Prisma'nın varsayılanı bu. Tabloyu yeniden kurmak depo
-- kuralına aykırıdır (kısmi indeks ve tetikleyiciler yalnız eklemeli göçle
-- korunur); mevcut satırlar varsayılanla aktif kalır. Sonuç
-- `kapi:sema-sapmasi` ile şemaya karşı ölçülür (sapma 0).

-- AlterTable
ALTER TABLE "MaddeEslestirmesi" ADD COLUMN "aktif" BOOLEAN NOT NULL DEFAULT true;
