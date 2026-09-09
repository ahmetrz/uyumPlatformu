-- P4 · 2.2 — DENETİM FORMU ve RAPOR ŞABLONU KATALOĞU
--
-- NİÇİN: form ve rapor bugüne kadar KODDU (`denetimler/Formlar.tsx`,
-- `raporlar/karne`); sektör paketi bunları YAPI olarak getirmeli
-- (docs/SEKTOR_PAKETI_SOZLESMESI.md §1/6–7). Tanım JSON'da durur;
-- köken · aktif · paketSurumId öbür paket tablolarıyla aynı sözleşmeyi
-- taşır (kiracı satırı ezilmez, bırakılan satır pasifleşir, silme yok).
--
-- YALNIZ YENİ TABLO: `prisma migrate diff --from-config-datasource
-- --to-schema` çıktısı birebir (RedefineTables yok, mevcut tabloya
-- dokunulmaz). Sonuç `kapi:sema-sapmasi` ile şemaya karşı ölçülür.

-- CreateTable
CREATE TABLE "FormSablonu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tur" TEXT NOT NULL DEFAULT 'denetim',
    "sektorId" TEXT,
    "dosyaAdi" TEXT,
    "tanimJson" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "FormSablonu_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RaporSablonu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "sektorId" TEXT,
    "tanimJson" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "RaporSablonu_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FormSablonu_kod_key" ON "FormSablonu"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "RaporSablonu_kod_key" ON "RaporSablonu"("kod");
