-- CreateTable
CREATE TABLE "Sektor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "TesisTipi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "sektorId" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "TesisTipi_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tesis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tipId" TEXT,
    "kuruluGucMw" REAL,
    "konum" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    "devreyeGiris" DATETIME,
    "kapanisTarihi" DATETIME,
    "kapanisNedeni" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tesis_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "TesisTipi" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Regulasyon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "surum" TEXT,
    "yururlukTarih" DATETIME,
    "kaynakUrl" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "KapsamAlani" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Madde" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regulasyonId" TEXT NOT NULL,
    "ustMaddeId" TEXT,
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "metin" TEXT NOT NULL,
    "kanitTipi" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Madde_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Madde_ustMaddeId_fkey" FOREIGN KEY ("ustMaddeId") REFERENCES "Madde" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaddeAlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maddeId" TEXT NOT NULL,
    "alanId" TEXT NOT NULL,
    CONSTRAINT "MaddeAlan_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeAlan_alanId_fkey" FOREIGN KEY ("alanId") REFERENCES "KapsamAlani" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UyumSureci" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "regulasyonId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'planlandi',
    "baslangic" DATETIME,
    "bitis" DATETIME,
    "aciklama" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UyumSureci_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SurecKapsami" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surecId" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    "eklendi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurecKapsami_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SurecKapsami_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaddeDurumu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surecId" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'incelemede',
    "sorumluId" TEXT,
    "not" TEXT,
    "sonDegerlendirme" DATETIME,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "MaddeDurumu_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bulgu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maddeDurumuId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL,
    "onemDerecesi" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "kaynak" TEXT,
    "tespitTarihi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hedefTarih" DATETIME,
    "kapanmaTarihi" DATETIME,
    "sorumluId" TEXT,
    CONSTRAINT "Bulgu_maddeDurumuId_fkey" FOREIGN KEY ("maddeDurumuId") REFERENCES "MaddeDurumu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bulgu_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Aksiyon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bulguId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "sorumluId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'planlandi',
    "baslangic" DATETIME,
    "hedef" DATETIME,
    "tamamlanma" DATETIME,
    CONSTRAINT "Aksiyon_bulguId_fkey" FOREIGN KEY ("bulguId") REFERENCES "Bulgu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Aksiyon_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Kanit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "dosyaYolu" TEXT,
    "gecerlilikBaslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "yukleyenId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Kanit_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KanitBaglantisi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kanitId" TEXT NOT NULL,
    "maddeDurumuId" TEXT NOT NULL,
    "eklendi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KanitBaglantisi_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KanitBaglantisi_maddeDurumuId_fkey" FOREIGN KEY ("maddeDurumuId") REFERENCES "MaddeDurumu" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaddeEslestirmesi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynakId" TEXT NOT NULL,
    "hedefId" TEXT NOT NULL,
    "denklik" TEXT NOT NULL,
    "aciklama" TEXT,
    CONSTRAINT "MaddeEslestirmesi_kaynakId_fkey" FOREIGN KEY ("kaynakId") REFERENCES "Madde" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeEslestirmesi_hedefId_fkey" FOREIGN KEY ("hedefId") REFERENCES "Madde" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proje" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'planlandi',
    "baslangic" DATETIME,
    "hedef" DATETIME,
    "sahipId" TEXT,
    CONSTRAINT "Proje_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjeBaglantisi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projeId" TEXT NOT NULL,
    "maddeId" TEXT,
    "bulguId" TEXT,
    CONSTRAINT "ProjeBaglantisi_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "Proje" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjeBaglantisi_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjeBaglantisi_bulguId_fkey" FOREIGN KEY ("bulguId") REFERENCES "Bulgu" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Kullanici" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eposta" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "unvan" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Yetki" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kullaniciId" TEXT NOT NULL,
    "surecId" TEXT,
    "tesisId" TEXT,
    "rol" TEXT NOT NULL,
    CONSTRAINT "Yetki_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Yetki_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Yetki_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AktiviteKaydi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aktorId" TEXT,
    "varlikTipi" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "eylem" TEXT NOT NULL,
    "alan" TEXT,
    "oncekiDeger" TEXT,
    "yeniDeger" TEXT,
    "dosyaAdi" TEXT,
    "zaman" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AktiviteKaydi_aktorId_fkey" FOREIGN KEY ("aktorId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IceAktarim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regulasyonId" TEXT NOT NULL,
    "kaynakTipi" TEXT NOT NULL,
    "kaynakAdi" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'dogrulama_bekliyor',
    "okunan" INTEGER NOT NULL DEFAULT 0,
    "eklenen" INTEGER NOT NULL DEFAULT 0,
    "guncellenen" INTEGER NOT NULL DEFAULT 0,
    "elenen" INTEGER NOT NULL DEFAULT 0,
    "raporJson" TEXT,
    "yukleyenId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IceAktarim_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IceAktarim_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Sektor_kod_key" ON "Sektor"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "TesisTipi_kod_key" ON "TesisTipi"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "Tesis_kod_key" ON "Tesis"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "Regulasyon_kod_key" ON "Regulasyon"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "KapsamAlani_kod_key" ON "KapsamAlani"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "Madde_regulasyonId_kod_key" ON "Madde"("regulasyonId", "kod");

-- CreateIndex
CREATE UNIQUE INDEX "MaddeAlan_maddeId_alanId_key" ON "MaddeAlan"("maddeId", "alanId");

-- CreateIndex
CREATE UNIQUE INDEX "UyumSureci_kod_key" ON "UyumSureci"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "SurecKapsami_surecId_tesisId_key" ON "SurecKapsami"("surecId", "tesisId");

-- CreateIndex
CREATE INDEX "MaddeDurumu_surecId_tesisId_durum_idx" ON "MaddeDurumu"("surecId", "tesisId", "durum");

-- CreateIndex
CREATE UNIQUE INDEX "MaddeDurumu_surecId_maddeId_tesisId_key" ON "MaddeDurumu"("surecId", "maddeId", "tesisId");

-- CreateIndex
CREATE INDEX "Bulgu_durum_onemDerecesi_idx" ON "Bulgu"("durum", "onemDerecesi");

-- CreateIndex
CREATE UNIQUE INDEX "KanitBaglantisi_kanitId_maddeDurumuId_key" ON "KanitBaglantisi"("kanitId", "maddeDurumuId");

-- CreateIndex
CREATE UNIQUE INDEX "MaddeEslestirmesi_kaynakId_hedefId_key" ON "MaddeEslestirmesi"("kaynakId", "hedefId");

-- CreateIndex
CREATE UNIQUE INDEX "Proje_kod_key" ON "Proje"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "ProjeBaglantisi_projeId_maddeId_bulguId_key" ON "ProjeBaglantisi"("projeId", "maddeId", "bulguId");

-- CreateIndex
CREATE UNIQUE INDEX "Kullanici_eposta_key" ON "Kullanici"("eposta");

-- CreateIndex
CREATE UNIQUE INDEX "Yetki_kullaniciId_surecId_tesisId_key" ON "Yetki"("kullaniciId", "surecId", "tesisId");

-- CreateIndex
CREATE INDEX "AktiviteKaydi_varlikTipi_varlikId_zaman_idx" ON "AktiviteKaydi"("varlikTipi", "varlikId", "zaman");
