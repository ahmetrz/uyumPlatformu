-- CreateTable
CREATE TABLE "AgSegmenti" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bolgeId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "vlanId" INTEGER,
    "cidr" TEXT NOT NULL,
    "gatewayIp" TEXT,
    "yonetimAgi" BOOLEAN,
    "aciklama" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "AgSegmenti_bolgeId_fkey" FOREIGN KEY ("bolgeId") REFERENCES "AgBolgesi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlanUygulanabilirligi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varlikTipi" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "alan" TEXT NOT NULL,
    "gerekce" TEXT NOT NULL,
    "kaydedenId" TEXT NOT NULL,
    "zaman" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlanUygulanabilirligi_kaydedenId_fkey" FOREIGN KEY ("kaydedenId") REFERENCES "Kullanici" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "YamaKaydi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varlikId" TEXT NOT NULL,
    "kaynakSistem" TEXT NOT NULL,
    "kaynakKayitId" TEXT NOT NULL,
    "mevcutSeviye" TEXT,
    "temelSeviye" TEXT,
    "yamaTarihi" DATETIME,
    "eksikYama" TEXT,
    "siddet" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "yenidenBaslatmaGerekli" BOOLEAN,
    "bakimPenceresi" TEXT,
    "istisnaGerekcesi" TEXT,
    "telafiEdiciKontrol" TEXT,
    "yamalanamaz" BOOLEAN NOT NULL DEFAULT false,
    "durum" TEXT NOT NULL DEFAULT 'karar_verilemedi',
    "sonDogrulama" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "YamaKaydi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FirmwareTemeli" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "turId" TEXT,
    "uretici" TEXT,
    "model" TEXT,
    "onayliSurum" TEXT NOT NULL,
    "asgariSurum" TEXT,
    "hedefSurum" TEXT,
    "bilinenKotuSurumler" TEXT,
    "advisoryReferansi" TEXT,
    "gecerlilikBaslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aciklama" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "FirmwareTemeli_turId_fkey" FOREIGN KEY ("turId") REFERENCES "VarlikTuru" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FirmwareUyumu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varlikId" TEXT NOT NULL,
    "temelId" TEXT,
    "kuruluSurum" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'karar_verilemedi',
    "gerekce" TEXT,
    "istisnaGerekcesi" TEXT,
    "yukseltmePlani" TEXT,
    "sonDogrulama" DATETIME,
    "kaynakSistem" TEXT,
    "hesaplanma" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FirmwareUyumu_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FirmwareUyumu_temelId_fkey" FOREIGN KEY ("temelId") REFERENCES "FirmwareTemeli" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Advisory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynak" TEXT NOT NULL,
    "referans" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "yayim" DATETIME,
    "guncelleme" DATETIME,
    "url" TEXT,
    "ozet" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AdvisoryUrunu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisoryId" TEXT NOT NULL,
    "uretici" TEXT,
    "urunAdi" TEXT,
    "cpe" TEXT,
    "etkilenenAlt" TEXT,
    "etkilenenAltDahil" BOOLEAN NOT NULL DEFAULT true,
    "etkilenenUst" TEXT,
    "etkilenenUstDahil" BOOLEAN NOT NULL DEFAULT false,
    "duzeltilenSurum" TEXT,
    CONSTRAINT "AdvisoryUrunu_advisoryId_fkey" FOREIGN KEY ("advisoryId") REFERENCES "Advisory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdvisoryZafiyeti" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisoryId" TEXT NOT NULL,
    "zafiyetId" TEXT NOT NULL,
    CONSTRAINT "AdvisoryZafiyeti_advisoryId_fkey" FOREIGN KEY ("advisoryId") REFERENCES "Advisory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdvisoryZafiyeti_zafiyetId_fkey" FOREIGN KEY ("zafiyetId") REFERENCES "Zafiyet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ZafiyetKorelasyonu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varlikId" TEXT NOT NULL,
    "zafiyetId" TEXT NOT NULL,
    "advisoryUrunId" TEXT,
    "yontem" TEXT NOT NULL,
    "sonuc" TEXT NOT NULL,
    "guven" REAL,
    "gerekce" TEXT NOT NULL,
    "kanitJson" TEXT,
    "elleSonuc" TEXT,
    "elleGerekce" TEXT,
    "elleKararVerenId" TEXT,
    "elleKararZamani" DATETIME,
    "hesaplanma" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ZafiyetKorelasyonu_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ZafiyetKorelasyonu_zafiyetId_fkey" FOREIGN KEY ("zafiyetId") REFERENCES "Zafiyet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SbomBelgesi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varlikId" TEXT,
    "yazilimId" TEXT,
    "bicim" TEXT NOT NULL,
    "bicimSurumu" TEXT,
    "seriNo" TEXT,
    "belgeSurumu" INTEGER NOT NULL DEFAULT 1,
    "uretimZamani" DATETIME,
    "kaynakSistem" TEXT NOT NULL,
    "kaynakKayitId" TEXT NOT NULL,
    "bilesenSayisi" INTEGER NOT NULL DEFAULT 0,
    "hamOzeti" TEXT,
    "yukleyenId" TEXT,
    "yuklendi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SbomBelgesi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SbomBelgesi_yazilimId_fkey" FOREIGN KEY ("yazilimId") REFERENCES "YazilimUrunu" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SbomBelgesi_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "YazilimBileseni" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "surum" TEXT,
    "purl" TEXT,
    "cpe" TEXT,
    "tedarikci" TEXT,
    "lisans" TEXT,
    "ozet" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SbomGirdisi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sbomId" TEXT NOT NULL,
    "bilesenId" TEXT NOT NULL,
    "kapsam" TEXT NOT NULL DEFAULT 'bilinmiyor',
    CONSTRAINT "SbomGirdisi_sbomId_fkey" FOREIGN KEY ("sbomId") REFERENCES "SbomBelgesi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SbomGirdisi_bilesenId_fkey" FOREIGN KEY ("bilesenId") REFERENCES "YazilimBileseni" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GuvenlikKapsami" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varlikId" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "kaynakSistem" TEXT,
    "kaynakKayitId" TEXT,
    "sonDogrulama" DATETIME,
    "gerekce" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "GuvenlikKapsami_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tesis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tipId" TEXT,
    "kuruluGucMw" REAL,
    "konum" TEXT,
    "enlem" REAL,
    "boylam" REAL,
    "konumKaynagi" TEXT,
    "konumDogrulandi" BOOLEAN NOT NULL DEFAULT false,
    "konumDogrulayanId" TEXT,
    "konumDogrulandiZaman" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    "devreyeGiris" DATETIME,
    "kapanisTarihi" DATETIME,
    "kapanisNedeni" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gorselAnahtari" TEXT,
    "tuzelKisiId" TEXT,
    CONSTRAINT "Tesis_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "TesisTipi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tesis_tuzelKisiId_fkey" FOREIGN KEY ("tuzelKisiId") REFERENCES "TuzelKisi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tesis_konumDogrulayanId_fkey" FOREIGN KEY ("konumDogrulayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tesis" ("ad", "boylam", "devreyeGiris", "durum", "enlem", "gorselAnahtari", "id", "kapanisNedeni", "kapanisTarihi", "kod", "konum", "konumDogrulandi", "konumDogrulandiZaman", "konumDogrulayanId", "konumKaynagi", "kuruluGucMw", "olusturuldu", "tipId", "tuzelKisiId") SELECT "ad", "boylam", "devreyeGiris", "durum", "enlem", "gorselAnahtari", "id", "kapanisNedeni", "kapanisTarihi", "kod", "konum", "konumDogrulandi", "konumDogrulandiZaman", "konumDogrulayanId", "konumKaynagi", "kuruluGucMw", "olusturuldu", "tipId", "tuzelKisiId" FROM "Tesis";
DROP TABLE "Tesis";
ALTER TABLE "new_Tesis" RENAME TO "Tesis";
CREATE UNIQUE INDEX "Tesis_kod_key" ON "Tesis"("kod");
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
    "macAdresi" TEXT,
    "isletimSistemi" TEXT,
    "firmware" TEXT,
    "surum" TEXT,
    "kurulumTarihi" DATETIME,
    "garantiBitis" DATETIME,
    "destekBitis" DATETIME,
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
    CONSTRAINT "Varlik_tedarikciId_fkey" FOREIGN KEY ("tedarikciId") REFERENCES "Tedarikci" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Varlik_sozlesmeId_fkey" FOREIGN KEY ("sozlesmeId") REFERENCES "Sozlesme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Varlik" ("ad", "bolgeId", "butunluk", "destekBitis", "edrDurumu", "emanetciId", "emniyetEtkisi", "eolTarihi", "eosTarihi", "erisilebilirlik", "etiket", "firmware", "garantiBitis", "gizlilik", "guncellendi", "hostname", "id", "internetMaruziyeti", "ipAdresi", "isletimSistemi", "izlemeDurumu", "kimlikDogrulama", "kritiklik", "kurulumTarihi", "logKaynagi", "macAdresi", "model", "olusturuldu", "rafOda", "sahipId", "seriNo", "silindi", "sistemId", "sozlesmeId", "surum", "tedarikciId", "tesisId", "turId", "uniteId", "uretici", "uretimEtkisi", "uzaktanErisim", "yamaDurumu", "yasamDongusu", "yedekDurumu") SELECT "ad", "bolgeId", "butunluk", "destekBitis", "edrDurumu", "emanetciId", "emniyetEtkisi", "eolTarihi", "eosTarihi", "erisilebilirlik", "etiket", "firmware", "garantiBitis", "gizlilik", "guncellendi", "hostname", "id", "internetMaruziyeti", "ipAdresi", "isletimSistemi", "izlemeDurumu", "kimlikDogrulama", "kritiklik", "kurulumTarihi", "logKaynagi", "macAdresi", "model", "olusturuldu", "rafOda", "sahipId", "seriNo", "silindi", "sistemId", "sozlesmeId", "surum", "tedarikciId", "tesisId", "turId", "uniteId", "uretici", "uretimEtkisi", "uzaktanErisim", "yamaDurumu", "yasamDongusu", "yedekDurumu" FROM "Varlik";
DROP TABLE "Varlik";
ALTER TABLE "new_Varlik" RENAME TO "Varlik";
CREATE UNIQUE INDEX "Varlik_etiket_key" ON "Varlik"("etiket");
CREATE INDEX "Varlik_tesisId_kritiklik_idx" ON "Varlik"("tesisId", "kritiklik");
CREATE INDEX "Varlik_eosTarihi_idx" ON "Varlik"("eosTarihi");
CREATE TABLE "new_Zafiyet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynakRef" TEXT,
    "baslik" TEXT NOT NULL,
    "cvss" REAL,
    "cvssVektor" TEXT,
    "cvssSurumu" TEXT,
    "cpe" TEXT,
    "istismarDurumu" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "kevMi" BOOLEAN,
    "epss" REAL,
    "aciklama" TEXT,
    "kesfedildi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Zafiyet" ("aciklama", "baslik", "cvss", "id", "kaynakRef", "kesfedildi") SELECT "aciklama", "baslik", "cvss", "id", "kaynakRef", "kesfedildi" FROM "Zafiyet";
DROP TABLE "Zafiyet";
ALTER TABLE "new_Zafiyet" RENAME TO "Zafiyet";
CREATE UNIQUE INDEX "Zafiyet_kaynakRef_key" ON "Zafiyet"("kaynakRef");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AgSegmenti_kod_key" ON "AgSegmenti"("kod");

-- CreateIndex
CREATE INDEX "AgSegmenti_vlanId_idx" ON "AgSegmenti"("vlanId");

-- CreateIndex
CREATE UNIQUE INDEX "AgSegmenti_bolgeId_cidr_key" ON "AgSegmenti"("bolgeId", "cidr");

-- CreateIndex
CREATE INDEX "AlanUygulanabilirligi_varlikTipi_varlikId_idx" ON "AlanUygulanabilirligi"("varlikTipi", "varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "AlanUygulanabilirligi_varlikTipi_varlikId_alan_key" ON "AlanUygulanabilirligi"("varlikTipi", "varlikId", "alan");

-- CreateIndex
CREATE INDEX "YamaKaydi_durum_idx" ON "YamaKaydi"("durum");

-- CreateIndex
CREATE INDEX "YamaKaydi_varlikId_idx" ON "YamaKaydi"("varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "YamaKaydi_varlikId_kaynakSistem_kaynakKayitId_key" ON "YamaKaydi"("varlikId", "kaynakSistem", "kaynakKayitId");

-- CreateIndex
CREATE UNIQUE INDEX "FirmwareTemeli_turId_uretici_model_key" ON "FirmwareTemeli"("turId", "uretici", "model");

-- CreateIndex
CREATE UNIQUE INDEX "FirmwareUyumu_varlikId_key" ON "FirmwareUyumu"("varlikId");

-- CreateIndex
CREATE INDEX "FirmwareUyumu_durum_idx" ON "FirmwareUyumu"("durum");

-- CreateIndex
CREATE UNIQUE INDEX "Advisory_referans_key" ON "Advisory"("referans");

-- CreateIndex
CREATE INDEX "AdvisoryUrunu_advisoryId_idx" ON "AdvisoryUrunu"("advisoryId");

-- CreateIndex
CREATE INDEX "AdvisoryUrunu_uretici_urunAdi_idx" ON "AdvisoryUrunu"("uretici", "urunAdi");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisoryZafiyeti_advisoryId_zafiyetId_key" ON "AdvisoryZafiyeti"("advisoryId", "zafiyetId");

-- CreateIndex
CREATE INDEX "ZafiyetKorelasyonu_sonuc_idx" ON "ZafiyetKorelasyonu"("sonuc");

-- CreateIndex
CREATE INDEX "ZafiyetKorelasyonu_varlikId_idx" ON "ZafiyetKorelasyonu"("varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "ZafiyetKorelasyonu_varlikId_zafiyetId_yontem_key" ON "ZafiyetKorelasyonu"("varlikId", "zafiyetId", "yontem");

-- CreateIndex
CREATE INDEX "SbomBelgesi_varlikId_idx" ON "SbomBelgesi"("varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "SbomBelgesi_kaynakSistem_kaynakKayitId_key" ON "SbomBelgesi"("kaynakSistem", "kaynakKayitId");

-- CreateIndex
CREATE INDEX "YazilimBileseni_purl_idx" ON "YazilimBileseni"("purl");

-- CreateIndex
CREATE INDEX "YazilimBileseni_ad_idx" ON "YazilimBileseni"("ad");

-- CreateIndex
CREATE UNIQUE INDEX "YazilimBileseni_ad_surum_purl_key" ON "YazilimBileseni"("ad", "surum", "purl");

-- CreateIndex
CREATE UNIQUE INDEX "SbomGirdisi_sbomId_bilesenId_key" ON "SbomGirdisi"("sbomId", "bilesenId");

-- CreateIndex
CREATE INDEX "GuvenlikKapsami_tip_durum_idx" ON "GuvenlikKapsami"("tip", "durum");

-- CreateIndex
CREATE UNIQUE INDEX "GuvenlikKapsami_varlikId_tip_key" ON "GuvenlikKapsami"("varlikId", "tip");
