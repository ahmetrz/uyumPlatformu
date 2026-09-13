-- CreateTable
CREATE TABLE "ProsesAdimi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surecId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "sira" INTEGER NOT NULL,
    "aciklama" TEXT,
    "rtoSaat" REAL,
    "rpoSaat" REAL,
    "uretimEtkisi" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "ProsesAdimi_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "IsSureci" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdimVarligi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adimId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'diger',
    "tekNokta" BOOLEAN,
    "yedekli" BOOLEAN,
    "aciklama" TEXT,
    CONSTRAINT "AdimVarligi_adimId_fkey" FOREIGN KEY ("adimId") REFERENCES "ProsesAdimi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdimVarligi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EtkiDegerlendirmesi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varlikId" TEXT NOT NULL,
    "uretimKaybiMw" REAL,
    "kayipTipi" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "rtoSaat" REAL,
    "rpoSaat" REAL,
    "emniyetEtkisi" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "cevreEtkisi" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "gerekce" TEXT,
    "degerlendirenId" TEXT,
    "zaman" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "EtkiDegerlendirmesi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EtkiDegerlendirmesi_degerlendirenId_fkey" FOREIGN KEY ("degerlendirenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ekip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'diger',
    "tesisId" TEXT,
    "eposta" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "Ekip_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EkipUyeligi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ekipId" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'uye',
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EkipUyeligi_ekipId_fkey" FOREIGN KEY ("ekipId") REFERENCES "Ekip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EkipUyeligi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KonfigTemeli" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varlikId" TEXT NOT NULL,
    "yedekId" TEXT,
    "ozetHash" TEXT NOT NULL,
    "onaylayanId" TEXT,
    "onayZamani" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "not" TEXT,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "KonfigTemeli_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KonfigTemeli_yedekId_fkey" FOREIGN KEY ("yedekId") REFERENCES "KonfigurasyonYedegi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KonfigTemeli_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KonfigSapmasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "temelId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "yedekId" TEXT,
    "gozlenenHash" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "degisiklikRef" TEXT,
    "siddet" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "aciklama" TEXT,
    "kararVerenId" TEXT,
    "kararZamani" DATETIME,
    "kararGerekcesi" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KonfigSapmasi_temelId_fkey" FOREIGN KEY ("temelId") REFERENCES "KonfigTemeli" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KonfigSapmasi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KonfigSapmasi_yedekId_fkey" FOREIGN KEY ("yedekId") REFERENCES "KonfigurasyonYedegi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KonfigSapmasi_kararVerenId_fkey" FOREIGN KEY ("kararVerenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OuiKaydi" (
    "onEk" TEXT NOT NULL PRIMARY KEY,
    "uretici" TEXT NOT NULL,
    "kaynak" TEXT,
    "yuklendi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KesifKaydi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectorId" TEXT,
    "kosuId" TEXT,
    "kaynak" TEXT NOT NULL,
    "kaynakKayitId" TEXT NOT NULL,
    "tesisId" TEXT,
    "hamJson" TEXT NOT NULL,
    "normalJson" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'kesfedildi',
    "eslesenVarlikId" TEXT,
    "eslesmeAnahtari" TEXT,
    "guvenSkoru" REAL,
    "yetkiDurumu" TEXT NOT NULL DEFAULT 'karar_verilmedi',
    "yetkiGerekcesi" TEXT,
    "yetkiKararVerenId" TEXT,
    "yetkiKararZamani" DATETIME,
    "ouiOnEki" TEXT,
    "otProtokolu" TEXT,
    "inceleyenId" TEXT,
    "incelemeZamani" DATETIME,
    "incelemeNotu" TEXT,
    "ilkGorulme" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonGorulme" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KesifKaydi_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KesifKaydi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KesifKaydi_eslesenVarlikId_fkey" FOREIGN KEY ("eslesenVarlikId") REFERENCES "Varlik" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KesifKaydi_inceleyenId_fkey" FOREIGN KEY ("inceleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KesifKaydi_yetkiKararVerenId_fkey" FOREIGN KEY ("yetkiKararVerenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_KesifKaydi" ("connectorId", "durum", "eslesenVarlikId", "eslesmeAnahtari", "guvenSkoru", "hamJson", "id", "ilkGorulme", "incelemeNotu", "incelemeZamani", "inceleyenId", "kaynak", "kaynakKayitId", "kosuId", "normalJson", "sonGorulme", "tesisId") SELECT "connectorId", "durum", "eslesenVarlikId", "eslesmeAnahtari", "guvenSkoru", "hamJson", "id", "ilkGorulme", "incelemeNotu", "incelemeZamani", "inceleyenId", "kaynak", "kaynakKayitId", "kosuId", "normalJson", "sonGorulme", "tesisId" FROM "KesifKaydi";
DROP TABLE "KesifKaydi";
ALTER TABLE "new_KesifKaydi" RENAME TO "KesifKaydi";
CREATE INDEX "KesifKaydi_yetkiDurumu_idx" ON "KesifKaydi"("yetkiDurumu");
CREATE INDEX "KesifKaydi_durum_sonGorulme_idx" ON "KesifKaydi"("durum", "sonGorulme");
CREATE INDEX "KesifKaydi_tesisId_durum_idx" ON "KesifKaydi"("tesisId", "durum");
CREATE INDEX "KesifKaydi_sonGorulme_idx" ON "KesifKaydi"("sonGorulme");
CREATE INDEX "KesifKaydi_eslesenVarlikId_sonGorulme_idx" ON "KesifKaydi"("eslesenVarlikId", "sonGorulme");
CREATE UNIQUE INDEX "KesifKaydi_kaynak_kaynakKayitId_key" ON "KesifKaydi"("kaynak", "kaynakKayitId");
CREATE TABLE "new_KimlikHesabi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hesapAdi" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "kullaniciId" TEXT,
    "tesisId" TEXT,
    "kaynakSistem" TEXT,
    "ayricalikli" BOOLEAN,
    "kaynakTipi" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "mfaVar" BOOLEAN,
    "sonaErme" DATETIME,
    "parolaPolitikasi" TEXT,
    "parolaRotasyon" DATETIME,
    "sonKullanim" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    CONSTRAINT "KimlikHesabi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KimlikHesabi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_KimlikHesabi" ("ayricalikli", "durum", "hesapAdi", "id", "kaynakSistem", "kullaniciId", "parolaRotasyon", "sonKullanim", "tesisId", "tip") SELECT "ayricalikli", "durum", "hesapAdi", "id", "kaynakSistem", "kullaniciId", "parolaRotasyon", "sonKullanim", "tesisId", "tip" FROM "KimlikHesabi";
DROP TABLE "KimlikHesabi";
ALTER TABLE "new_KimlikHesabi" RENAME TO "KimlikHesabi";
CREATE UNIQUE INDEX "KimlikHesabi_hesapAdi_key" ON "KimlikHesabi"("hesapAdi");
CREATE TABLE "new_SistemServis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tesisId" TEXT,
    "uniteId" TEXT,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'sistem',
    "aciklama" TEXT,
    "kritiklik" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "sahipId" TEXT,
    "ekipId" TEXT,
    CONSTRAINT "SistemServis_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SistemServis_uniteId_fkey" FOREIGN KEY ("uniteId") REFERENCES "UretimUnitesi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SistemServis_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SistemServis_ekipId_fkey" FOREIGN KEY ("ekipId") REFERENCES "Ekip" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SistemServis" ("aciklama", "ad", "id", "kod", "kritiklik", "sahipId", "tesisId", "tip", "uniteId") SELECT "aciklama", "ad", "id", "kod", "kritiklik", "sahipId", "tesisId", "tip", "uniteId" FROM "SistemServis";
DROP TABLE "SistemServis";
ALTER TABLE "new_SistemServis" RENAME TO "SistemServis";
CREATE UNIQUE INDEX "SistemServis_kod_key" ON "SistemServis"("kod");
CREATE TABLE "new_Varlik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "etiket" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "turId" TEXT NOT NULL,
    "tesisId" TEXT,
    "uniteId" TEXT,
    "sistemId" TEXT,
    "hostname" TEXT,
    "seriNo" TEXT,
    "uretici" TEXT,
    "model" TEXT,
    "sahipId" TEXT,
    "emanetciId" TEXT,
    "kritiklik" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "emniyetEtkisi" TEXT,
    "uretimEtkisi" TEXT,
    "gizlilik" INTEGER,
    "butunluk" INTEGER,
    "erisilebilirlik" INTEGER,
    "ipAdresi" TEXT,
    "ipv6Adresi" TEXT,
    "macAdresi" TEXT,
    "isletimSistemi" TEXT,
    "isletimSistemiSurumu" TEXT,
    "firmware" TEXT,
    "firmwareYapisi" TEXT,
    "donanimRevizyonu" TEXT,
    "surum" TEXT,
    "kurulumTarihi" DATETIME,
    "garantiBitis" DATETIME,
    "garantiSaglayici" TEXT,
    "destekBitis" DATETIME,
    "bakimBitis" DATETIME,
    "sonBakim" DATETIME,
    "sonrakiBakim" DATETIME,
    "eolTarihi" DATETIME,
    "eosTarihi" DATETIME,
    "yamaDurumu" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "edrDurumu" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "yedekDurumu" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "izlemeDurumu" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "logKaynagi" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "kimlikDogrulama" TEXT,
    "internetMaruziyeti" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "uzaktanErisim" BOOLEAN,
    "bolgeId" TEXT,
    "segmentId" TEXT,
    "ekipId" TEXT,
    "rafOda" TEXT,
    "tedarikciId" TEXT,
    "sozlesmeId" TEXT,
    "yasamDongusu" TEXT NOT NULL DEFAULT 'aktif',
    "silindi" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "Varlik_turId_fkey" FOREIGN KEY ("turId") REFERENCES "VarlikTuru" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Varlik_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Varlik_uniteId_fkey" FOREIGN KEY ("uniteId") REFERENCES "UretimUnitesi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Varlik_sistemId_fkey" FOREIGN KEY ("sistemId") REFERENCES "SistemServis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Varlik_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Varlik_emanetciId_fkey" FOREIGN KEY ("emanetciId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Varlik_bolgeId_fkey" FOREIGN KEY ("bolgeId") REFERENCES "AgBolgesi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Varlik_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "AgSegmenti" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Varlik_ekipId_fkey" FOREIGN KEY ("ekipId") REFERENCES "Ekip" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Varlik_tedarikciId_fkey" FOREIGN KEY ("tedarikciId") REFERENCES "Tedarikci" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Varlik_sozlesmeId_fkey" FOREIGN KEY ("sozlesmeId") REFERENCES "Sozlesme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Varlik" ("ad", "bolgeId", "butunluk", "destekBitis", "donanimRevizyonu", "edrDurumu", "emanetciId", "emniyetEtkisi", "eolTarihi", "eosTarihi", "erisilebilirlik", "etiket", "firmware", "firmwareYapisi", "garantiBitis", "gizlilik", "guncellendi", "hostname", "id", "internetMaruziyeti", "ipAdresi", "ipv6Adresi", "isletimSistemi", "isletimSistemiSurumu", "izlemeDurumu", "kimlikDogrulama", "kritiklik", "kurulumTarihi", "logKaynagi", "macAdresi", "model", "olusturuldu", "rafOda", "sahipId", "segmentId", "seriNo", "silindi", "sistemId", "sozlesmeId", "surum", "tedarikciId", "tesisId", "turId", "uniteId", "uretici", "uretimEtkisi", "uzaktanErisim", "yamaDurumu", "yasamDongusu", "yedekDurumu") SELECT "ad", "bolgeId", "butunluk", "destekBitis", "donanimRevizyonu", "edrDurumu", "emanetciId", "emniyetEtkisi", "eolTarihi", "eosTarihi", "erisilebilirlik", "etiket", "firmware", "firmwareYapisi", "garantiBitis", "gizlilik", "guncellendi", "hostname", "id", "internetMaruziyeti", "ipAdresi", "ipv6Adresi", "isletimSistemi", "isletimSistemiSurumu", "izlemeDurumu", "kimlikDogrulama", "kritiklik", "kurulumTarihi", "logKaynagi", "macAdresi", "model", "olusturuldu", "rafOda", "sahipId", "segmentId", "seriNo", "silindi", "sistemId", "sozlesmeId", "surum", "tedarikciId", "tesisId", "turId", "uniteId", "uretici", "uretimEtkisi", "uzaktanErisim", "yamaDurumu", "yasamDongusu", "yedekDurumu" FROM "Varlik";
DROP TABLE "Varlik";
ALTER TABLE "new_Varlik" RENAME TO "Varlik";
CREATE UNIQUE INDEX "Varlik_etiket_key" ON "Varlik"("etiket");
CREATE INDEX "Varlik_tesisId_kritiklik_idx" ON "Varlik"("tesisId", "kritiklik");
CREATE INDEX "Varlik_eosTarihi_idx" ON "Varlik"("eosTarihi");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProsesAdimi_surecId_idx" ON "ProsesAdimi"("surecId");

-- CreateIndex
CREATE UNIQUE INDEX "ProsesAdimi_surecId_kod_key" ON "ProsesAdimi"("surecId", "kod");

-- CreateIndex
CREATE UNIQUE INDEX "ProsesAdimi_surecId_sira_key" ON "ProsesAdimi"("surecId", "sira");

-- CreateIndex
CREATE INDEX "AdimVarligi_varlikId_idx" ON "AdimVarligi"("varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "AdimVarligi_adimId_varlikId_rol_key" ON "AdimVarligi"("adimId", "varlikId", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "EtkiDegerlendirmesi_varlikId_key" ON "EtkiDegerlendirmesi"("varlikId");

-- CreateIndex
CREATE INDEX "EtkiDegerlendirmesi_kayipTipi_idx" ON "EtkiDegerlendirmesi"("kayipTipi");

-- CreateIndex
CREATE UNIQUE INDEX "Ekip_kod_key" ON "Ekip"("kod");

-- CreateIndex
CREATE INDEX "Ekip_tesisId_aktif_idx" ON "Ekip"("tesisId", "aktif");

-- CreateIndex
CREATE INDEX "EkipUyeligi_kullaniciId_idx" ON "EkipUyeligi"("kullaniciId");

-- CreateIndex
CREATE UNIQUE INDEX "EkipUyeligi_ekipId_kullaniciId_key" ON "EkipUyeligi"("ekipId", "kullaniciId");

-- CreateIndex
CREATE UNIQUE INDEX "KonfigTemeli_varlikId_key" ON "KonfigTemeli"("varlikId");

-- CreateIndex
CREATE INDEX "KonfigSapmasi_durum_siddet_idx" ON "KonfigSapmasi"("durum", "siddet");

-- CreateIndex
CREATE INDEX "KonfigSapmasi_varlikId_idx" ON "KonfigSapmasi"("varlikId");

-- CreateIndex
CREATE INDEX "OuiKaydi_uretici_idx" ON "OuiKaydi"("uretici");
