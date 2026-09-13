-- R15 · KİŞİSEL VERİ KORUMA MODÜLÜ
--
-- ── ÇEKİRDEK MEVZUAT ADI TAŞIMAZ ─────────────────────────────────────
-- Modülün çekirdekteki adı "kişisel veri koruma"dır. Sicilin adı
-- (`SicilKaydi.sicilAd`), süreler (`VeriKorumaSuresi.gun`) ve hukuki
-- sebep sözlüğü PAKETTEN gelir. Bir Alman kiracının veritabanında
-- `verbisNo` diye bir kolon bulunması, ürünün sektör ve ülke
-- bağımsızlık vaadini ilk günden bozar.
--
-- ── ÜÇ DEĞERLİ ALANLAR BİLEREK NULLABLE ──────────────────────────────
-- `ozelNitelikli` · `yukumluMu` · `kisiselVeriIhlali` · `bildirimTarihi`
-- · `sonTarih` · `gun` · `etkilenenKayit`. `null` "hayır" DEĞİL
-- "değerlendirilmedi"dir: sayaç işlemez, ekran bunu cümleyle söyler.
--
-- ── İŞ SÜRECİNE BAĞLI OLMADAN KAYDEDİLEMEZ (KVK-ENV-004) ─────────────
-- `VeriIslemeFaaliyeti.isSureciId` NULLABLE DEĞİLDİR. Sürece
-- bağlanmamış bir işleme envanteri, denetçinin ilk sorusuna ("bu veriyi
-- hangi iş için işliyorsunuz") cevap veremez. Kapı İKİ yerdedir:
-- sunucu eylemi ve kolonun kendisi; dıştaki unutulursa içteki tutar.
--
-- ── EK KAPSAM KOŞULU (BildirimYukumlulugu.kapsamKosulu) ──────────────
-- Şiddet ve regülasyon bir yükümlülüğü uyandırmaya her zaman yetmez:
-- KVKK 72 saat yükümlülüğü `asgariSiddet: 'orta'` ile HER orta olaya
-- uyuyordu ve kişisel veri hiç işlenmemiş bir kesinti için de Kurula
-- bildirim taslağı açılıyordu. NULL = ek koşul yok (geriye dönük
-- uyumlu). Koşul POZİTİF yüklemdir: tanınmayan bir kod uyandırmaz.

-- AlterTable
ALTER TABLE "BildirimYukumlulugu" ADD COLUMN "kapsamKosulu" TEXT;

-- AlterTable
ALTER TABLE "Olay" ADD COLUMN "kisiselVeriIhlali" BOOLEAN;

-- CreateTable
CREATE TABLE "VeriKorumaSuresi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "konu" TEXT NOT NULL,
    "gun" INTEGER,
    "isGunu" BOOLEAN NOT NULL DEFAULT false,
    "haftaSonuJson" TEXT,
    "dayanak" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VeriIslemeFaaliyeti" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "isSureciId" TEXT NOT NULL,
    "amac" TEXT NOT NULL,
    "hukukiSebep" TEXT NOT NULL,
    "veriKategorileriJson" TEXT NOT NULL DEFAULT '[]',
    "ilgiliKisiGruplariJson" TEXT NOT NULL DEFAULT '[]',
    "aliciGruplariJson" TEXT NOT NULL DEFAULT '[]',
    "ozelNitelikli" BOOLEAN,
    "saklamaPolitikasiId" TEXT,
    "maddeId" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "VeriIslemeFaaliyeti_isSureciId_fkey" FOREIGN KEY ("isSureciId") REFERENCES "IsSureci" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VeriIslemeFaaliyeti_saklamaPolitikasiId_fkey" FOREIGN KEY ("saklamaPolitikasiId") REFERENCES "SaklamaPolitikasi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VeriIslemeFaaliyeti_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "YurtDisiAktarim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "faaliyetId" TEXT NOT NULL,
    "aliciUlke" TEXT NOT NULL,
    "aliciAd" TEXT,
    "dayanak" TEXT NOT NULL,
    "bildirimTarihi" DATETIME,
    "bildirimSonTarih" DATETIME,
    "not" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "YurtDisiAktarim_faaliyetId_fkey" FOREIGN KEY ("faaliyetId") REFERENCES "VeriIslemeFaaliyeti" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VeriSahibiBasvurusu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "alinma" DATETIME NOT NULL,
    "kanal" TEXT,
    "konu" TEXT NOT NULL,
    "ozet" TEXT,
    "sonTarih" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'yeni',
    "yanitMetni" TEXT,
    "yanitlayanId" TEXT,
    "yanitZamani" DATETIME,
    "redGerekcesi" TEXT,
    "gorevId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "VeriSahibiBasvurusu_yanitlayanId_fkey" FOREIGN KEY ("yanitlayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SicilKaydi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sicilAd" TEXT NOT NULL,
    "sicilNo" TEXT,
    "kayitTarihi" DATETIME,
    "sonGuncelleme" DATETIME,
    "yukumluMu" BOOLEAN,
    "muafiyetGerekcesi" TEXT,
    "sorumluId" TEXT,
    "dayanak" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "SicilKaydi_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OlayVeriFaaliyeti" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "olayId" TEXT NOT NULL,
    "faaliyetId" TEXT NOT NULL,
    "etkilenenKayit" INTEGER,
    "not" TEXT,
    CONSTRAINT "OlayVeriFaaliyeti_olayId_fkey" FOREIGN KEY ("olayId") REFERENCES "Olay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OlayVeriFaaliyeti_faaliyetId_fkey" FOREIGN KEY ("faaliyetId") REFERENCES "VeriIslemeFaaliyeti" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VeriKorumaSuresi_konu_key" ON "VeriKorumaSuresi"("konu");

-- CreateIndex
CREATE UNIQUE INDEX "VeriIslemeFaaliyeti_kod_key" ON "VeriIslemeFaaliyeti"("kod");

-- CreateIndex
CREATE INDEX "VeriIslemeFaaliyeti_isSureciId_idx" ON "VeriIslemeFaaliyeti"("isSureciId");

-- CreateIndex
CREATE INDEX "YurtDisiAktarim_faaliyetId_idx" ON "YurtDisiAktarim"("faaliyetId");

-- CreateIndex
CREATE INDEX "YurtDisiAktarim_dayanak_idx" ON "YurtDisiAktarim"("dayanak");

-- CreateIndex
CREATE UNIQUE INDEX "VeriSahibiBasvurusu_kod_key" ON "VeriSahibiBasvurusu"("kod");

-- CreateIndex
CREATE INDEX "VeriSahibiBasvurusu_durum_sonTarih_idx" ON "VeriSahibiBasvurusu"("durum", "sonTarih");

-- CreateIndex
CREATE UNIQUE INDEX "OlayVeriFaaliyeti_olayId_faaliyetId_key" ON "OlayVeriFaaliyeti"("olayId", "faaliyetId");

