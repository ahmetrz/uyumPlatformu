-- CreateTable
CREATE TABLE "EnvanterSayimi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    "turId" TEXT,
    "bolgeId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'hazirlik',
    "baslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" DATETIME,
    "acanId" TEXT NOT NULL,
    "kapatanId" TEXT,
    "kapsamSayisi" INTEGER NOT NULL,
    "gerekce" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnvanterSayimi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EnvanterSayimi_turId_fkey" FOREIGN KEY ("turId") REFERENCES "VarlikTuru" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EnvanterSayimi_bolgeId_fkey" FOREIGN KEY ("bolgeId") REFERENCES "AgBolgesi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EnvanterSayimi_acanId_fkey" FOREIGN KEY ("acanId") REFERENCES "Kullanici" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EnvanterSayimi_kapatanId_fkey" FOREIGN KEY ("kapatanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SayimSatiri" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sayimId" TEXT NOT NULL,
    "varlikId" TEXT,
    "sahaKimligi" TEXT,
    "sonuc" TEXT NOT NULL DEFAULT 'sayilmadi',
    "bulunanYer" TEXT,
    "not" TEXT,
    "sayanId" TEXT,
    "sayimZamani" DATETIME,
    CONSTRAINT "SayimSatiri_sayimId_fkey" FOREIGN KEY ("sayimId") REFERENCES "EnvanterSayimi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SayimSatiri_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SayimSatiri_sayanId_fkey" FOREIGN KEY ("sayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "YedekParca" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "ureticiParcaNo" TEXT,
    "turId" TEXT,
    "tesisId" TEXT,
    "konum" TEXT,
    "stokAdedi" INTEGER NOT NULL,
    "kritikEsik" INTEGER NOT NULL DEFAULT 1,
    "tedarikSuresiGun" INTEGER,
    "tedarikciId" TEXT,
    "sonSayim" DATETIME,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "YedekParca_turId_fkey" FOREIGN KEY ("turId") REFERENCES "VarlikTuru" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "YedekParca_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "YedekParca_tedarikciId_fkey" FOREIGN KEY ("tedarikciId") REFERENCES "Tedarikci" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "YedekParcaVarlik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcaId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    CONSTRAINT "YedekParcaVarlik_parcaId_fkey" FOREIGN KEY ("parcaId") REFERENCES "YedekParca" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "YedekParcaVarlik_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TasinabilirMedya" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'usb_bellek',
    "seriNo" TEXT,
    "tesisId" TEXT,
    "sahibiId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'kayitli',
    "sifreli" BOOLEAN,
    "sonTarama" DATETIME,
    "not" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "TasinabilirMedya_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TasinabilirMedya_sahibiId_fkey" FOREIGN KEY ("sahibiId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedyaKullanimi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medyaId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "baslangic" DATETIME NOT NULL,
    "bitis" DATETIME,
    "amac" TEXT NOT NULL,
    "onaylayanId" TEXT,
    "onayZamani" DATETIME,
    "kaynakSistem" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MedyaKullanimi_medyaId_fkey" FOREIGN KEY ("medyaId") REFERENCES "TasinabilirMedya" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MedyaKullanimi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MedyaKullanimi_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BildirimYukumlulugu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "regulasyonId" TEXT,
    "asgariSiddet" TEXT NOT NULL DEFAULT 'yuksek',
    "sureSaat" INTEGER NOT NULL,
    "dayanak" TEXT NOT NULL,
    "merci" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleyenId" TEXT,
    CONSTRAINT "BildirimYukumlulugu_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BildirimYukumlulugu_guncelleyenId_fkey" FOREIGN KEY ("guncelleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KontrolTesti" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maddeDurumuId" TEXT NOT NULL,
    "yontem" TEXT NOT NULL,
    "evrenSayisi" INTEGER,
    "orneklemSayisi" INTEGER,
    "uygunSayisi" INTEGER,
    "sonuc" TEXT NOT NULL,
    "testTarihi" DATETIME NOT NULL,
    "testEdenId" TEXT NOT NULL,
    "not" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KontrolTesti_maddeDurumuId_fkey" FOREIGN KEY ("maddeDurumuId") REFERENCES "MaddeDurumu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KontrolTesti_testEdenId_fkey" FOREIGN KEY ("testEdenId") REFERENCES "Kullanici" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "YonetimGozdenGecirme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "tarih" DATETIME NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'planli',
    "regulasyonId" TEXT,
    "katilimcilar" TEXT,
    "gundem" TEXT,
    "ozet" TEXT,
    "yurutenId" TEXT NOT NULL,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "YonetimGozdenGecirme_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "YonetimGozdenGecirme_yurutenId_fkey" FOREIGN KEY ("yurutenId") REFERENCES "Kullanici" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GozdenGecirmeKarari" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gozdenGecirmeId" TEXT NOT NULL,
    "karar" TEXT NOT NULL,
    "sorumluId" TEXT,
    "sonTarih" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "gorevId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GozdenGecirmeKarari_gozdenGecirmeId_fkey" FOREIGN KEY ("gozdenGecirmeId") REFERENCES "YonetimGozdenGecirme" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GozdenGecirmeKarari_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GozdenGecirmeKarari_gorevId_fkey" FOREIGN KEY ("gorevId") REFERENCES "Gorev" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Egitim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "gecerlilikAy" INTEGER,
    "zorunlu" BOOLEAN NOT NULL DEFAULT false,
    "aciklama" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EgitimKaydi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "egitimId" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "tamamlanma" DATETIME NOT NULL,
    "gecerlilikBitis" DATETIME,
    "belgeNo" TEXT,
    "kanitId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EgitimKaydi_egitimId_fkey" FOREIGN KEY ("egitimId") REFERENCES "Egitim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EgitimKaydi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EgitimKaydi_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EgitimMadde" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "egitimId" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,
    CONSTRAINT "EgitimMadde_egitimId_fkey" FOREIGN KEY ("egitimId") REFERENCES "Egitim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EgitimMadde_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EnvanterSayimi_kod_key" ON "EnvanterSayimi"("kod");

-- CreateIndex
CREATE INDEX "EnvanterSayimi_tesisId_durum_idx" ON "EnvanterSayimi"("tesisId", "durum");

-- CreateIndex
CREATE INDEX "SayimSatiri_sayimId_sonuc_idx" ON "SayimSatiri"("sayimId", "sonuc");

-- CreateIndex
CREATE INDEX "SayimSatiri_varlikId_idx" ON "SayimSatiri"("varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "YedekParca_kod_key" ON "YedekParca"("kod");

-- CreateIndex
CREATE INDEX "YedekParca_tesisId_aktif_idx" ON "YedekParca"("tesisId", "aktif");

-- CreateIndex
CREATE INDEX "YedekParcaVarlik_varlikId_idx" ON "YedekParcaVarlik"("varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "YedekParcaVarlik_parcaId_varlikId_key" ON "YedekParcaVarlik"("parcaId", "varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "TasinabilirMedya_kod_key" ON "TasinabilirMedya"("kod");

-- CreateIndex
CREATE INDEX "TasinabilirMedya_tesisId_durum_idx" ON "TasinabilirMedya"("tesisId", "durum");

-- CreateIndex
CREATE INDEX "MedyaKullanimi_medyaId_idx" ON "MedyaKullanimi"("medyaId");

-- CreateIndex
CREATE INDEX "MedyaKullanimi_varlikId_baslangic_idx" ON "MedyaKullanimi"("varlikId", "baslangic");

-- CreateIndex
CREATE UNIQUE INDEX "BildirimYukumlulugu_kod_key" ON "BildirimYukumlulugu"("kod");

-- CreateIndex
CREATE INDEX "KontrolTesti_maddeDurumuId_testTarihi_idx" ON "KontrolTesti"("maddeDurumuId", "testTarihi");

-- CreateIndex
CREATE UNIQUE INDEX "YonetimGozdenGecirme_kod_key" ON "YonetimGozdenGecirme"("kod");

-- CreateIndex
CREATE INDEX "YonetimGozdenGecirme_durum_tarih_idx" ON "YonetimGozdenGecirme"("durum", "tarih");

-- CreateIndex
CREATE INDEX "GozdenGecirmeKarari_gozdenGecirmeId_durum_idx" ON "GozdenGecirmeKarari"("gozdenGecirmeId", "durum");

-- CreateIndex
CREATE UNIQUE INDEX "Egitim_kod_key" ON "Egitim"("kod");

-- CreateIndex
CREATE INDEX "EgitimKaydi_kullaniciId_idx" ON "EgitimKaydi"("kullaniciId");

-- CreateIndex
CREATE UNIQUE INDEX "EgitimKaydi_egitimId_kullaniciId_tamamlanma_key" ON "EgitimKaydi"("egitimId", "kullaniciId", "tamamlanma");

-- CreateIndex
CREATE UNIQUE INDEX "EgitimMadde_egitimId_maddeId_key" ON "EgitimMadde"("egitimId", "maddeId");
