-- P4 · 2.3 — ROL KATALOĞU
--
-- NİÇİN: roller koda gömülü (`lib/erisim.ts` ROL_IZINLERI · `lib/sabitler.ts`
-- ROLLER); sektör paketi rol ÖNERİR (docs/SEKTOR_PAKETI_SOZLESMESI.md §1/8):
-- kod, ad, modül × işlem izinleri (JSON), kapsam ekseni, sıra. Paket
-- önerir, kiracı ezer: kiracı kökenli satır paket güncellemesinde değişmez.
-- ÇALIŞMA ZAMANI YETKİSİ (`izinVar`) BU TABLOYU OKUMAZ — kod sabiti
-- geçerlidir; katalog öneri ve ekran (/paketler) içindir; koda bağlanması
-- P2/P6 kararıdır. Köken · aktif · paketSurumId öbür paket tablolarıyla
-- aynı sözleşme (bırakılan satır pasif, silme yok — R-C).
--
-- YALNIZ YENİ TABLO: `prisma migrate diff --from-config-datasource
-- --to-schema` çıktısı birebir (RedefineTables yok, mevcut tabloya
-- dokunulmaz). Sonuç `kapi:sema-sapmasi` ile şemaya karşı ölçülür.

-- CreateTable
CREATE TABLE "RolKatalogu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT,
    "izinlerJson" TEXT NOT NULL,
    "kapsamEkseni" TEXT NOT NULL DEFAULT 'global',
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RolKatalogu_kod_key" ON "RolKatalogu"("kod");

