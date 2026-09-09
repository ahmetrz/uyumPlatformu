-- P4 · İÇERİK PAKETİ MİMARİSİ — katalog tabloları, lisans sınırı, köken
--
-- NİÇİN: sektör-ülke paketleri (docs/SEKTOR_PAKETI_SOZLESMESI.md) veri
-- getirir, kod getirmez. Kurulumun kaydı (`IcerikPaketi` · `IcerikPaketiSurumu`)
-- ve paketin dokunduğu satırların KÖKENİ (`koken` · `paketSurumId`) olmadan
-- "müşterinin eşlemesi ezilmez" (§4) kuralı uygulanamaz: hangi satırın
-- paketten, hangisinin kiracıdan geldiği bilinmez. Lisans sınırı (§2) da
-- yorumda değil ALANDA durur: `Regulasyon.lisansTuru` · `metinDahil`.
--
-- EKLEMELİ GÖÇ, ELLE YAZILDI. `prisma migrate diff` bu kolonlar için yedi
-- tabloyu yeniden kuruyordu (RedefineTables: yeni tablo → kopya → DROP →
-- RENAME). DROP, tabloya ham SQL ile eklenmiş ve Prisma'nın görmediği
-- kısıtları da düşürür — `FrameworkSurumu_tekAktif` kısmi tekil indeksi
-- (`20260901201000_framework_surumu_tek_aktif`) böyle kaybolurdu ve şema
-- yorumu tam bunu uyarıyor. `ALTER TABLE … ADD COLUMN` (SQLite: nullable ya
-- da sabit varsayılanlı kolon) tabloyu yerinde bırakır; indeks ve
-- tetikleyici korunur. Sonuç `kapi:sema-sapmasi` ile şemaya karşı ölçülür.
--
-- VERİ KAYBI YOK: yalnız yeni tablo ve varsayılanlı/nullable kolon. Mevcut
-- her satır `koken = 'kiraci'` olur — paketten gelmedi, paket güncellemesi
-- ona dokunmaz. Tohum ve göç aynı varsayılanı taşır.

-- CreateTable
CREATE TABLE "IcerikPaketi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "ulke" TEXT,
    "sektorKod" TEXT,
    "dil" TEXT NOT NULL DEFAULT 'tr',
    "yayinci" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'kurulu',
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IcerikPaketiSurumu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paketId" TEXT NOT NULL,
    "surum" TEXT NOT NULL,
    "lisansJson" TEXT NOT NULL,
    "ozetJson" TEXT NOT NULL,
    "manifestJson" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'kurulu',
    "kurulumZamani" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kuranId" TEXT,
    "raporJson" TEXT,
    CONSTRAINT "IcerikPaketiSurumu_paketId_fkey" FOREIGN KEY ("paketId") REFERENCES "IcerikPaketi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IcerikPaketiSurumu_kuranId_fkey" FOREIGN KEY ("kuranId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IcerikPaketi_kod_key" ON "IcerikPaketi"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "IcerikPaketiSurumu_paketId_surum_key" ON "IcerikPaketiSurumu"("paketId", "surum");

-- Lisans sınırı (§2) — yalnız Regulasyon
ALTER TABLE "Regulasyon" ADD COLUMN "lisansTuru" TEXT;
ALTER TABLE "Regulasyon" ADD COLUMN "metinDahil" BOOLEAN;

-- Köken (§4) — paketin dokunduğu yedi tablo
ALTER TABLE "Regulasyon" ADD COLUMN "koken" TEXT NOT NULL DEFAULT 'kiraci';
ALTER TABLE "Regulasyon" ADD COLUMN "paketSurumId" TEXT;
ALTER TABLE "FrameworkSurumu" ADD COLUMN "koken" TEXT NOT NULL DEFAULT 'kiraci';
ALTER TABLE "FrameworkSurumu" ADD COLUMN "paketSurumId" TEXT;
ALTER TABLE "MaddeEslestirmesi" ADD COLUMN "koken" TEXT NOT NULL DEFAULT 'kiraci';
ALTER TABLE "MaddeEslestirmesi" ADD COLUMN "paketSurumId" TEXT;
ALTER TABLE "SektorSozlugu" ADD COLUMN "koken" TEXT NOT NULL DEFAULT 'kiraci';
ALTER TABLE "SektorSozlugu" ADD COLUMN "paketSurumId" TEXT;
ALTER TABLE "KapsamOgesiTuru" ADD COLUMN "koken" TEXT NOT NULL DEFAULT 'kiraci';
ALTER TABLE "KapsamOgesiTuru" ADD COLUMN "paketSurumId" TEXT;
ALTER TABLE "SektorOznitelikSemasi" ADD COLUMN "koken" TEXT NOT NULL DEFAULT 'kiraci';
ALTER TABLE "SektorOznitelikSemasi" ADD COLUMN "paketSurumId" TEXT;
ALTER TABLE "BildirimYukumlulugu" ADD COLUMN "koken" TEXT NOT NULL DEFAULT 'kiraci';
ALTER TABLE "BildirimYukumlulugu" ADD COLUMN "paketSurumId" TEXT;
