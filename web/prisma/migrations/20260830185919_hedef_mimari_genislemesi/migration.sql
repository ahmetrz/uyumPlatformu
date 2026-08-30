-- AlterTable
ALTER TABLE "Kullanici" ADD COLUMN "parolaHash" TEXT;

-- CreateTable
CREATE TABLE "Grup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TuzelKisi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grupId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "vergiNo" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TuzelKisi_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "Grup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UretimUnitesi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tesisId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "kuruluGucMw" REAL,
    "devreyeGiris" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    CONSTRAINT "UretimUnitesi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SistemServis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tesisId" TEXT,
    "uniteId" TEXT,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'sistem',
    "aciklama" TEXT,
    "kritiklik" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "sahipId" TEXT,
    CONSTRAINT "SistemServis_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SistemServis_uniteId_fkey" FOREIGN KEY ("uniteId") REFERENCES "UretimUnitesi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SistemServis_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IsSureci" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tesisId" TEXT,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "uretimEtkisi" TEXT NOT NULL DEFAULT 'bilinmiyor',
    CONSTRAINT "IsSureci_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IsSureciSistemi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surecId" TEXT NOT NULL,
    "sistemId" TEXT NOT NULL,
    CONSTRAINT "IsSureciSistemi_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "IsSureci" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IsSureciSistemi_sistemId_fkey" FOREIGN KEY ("sistemId") REFERENCES "SistemServis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TesisProfili" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tesisId" TEXT NOT NULL,
    "lisansTipi" TEXT,
    "lisansNo" TEXT,
    "kabulDurumu" TEXT,
    "kabulTarihi" DATETIME,
    "blackStart" BOOLEAN,
    "teiasScadaEms" BOOLEAN,
    "seriHaberlesme" BOOLEAN,
    "kritiklikSinifi" TEXT,
    "kritikAltyapiStatusu" BOOLEAN,
    "veriIslemeProfili" TEXT,
    "internetMaruziyeti" TEXT,
    "uzaktanErisim" BOOLEAN,
    "otMimariTipi" TEXT,
    "dcsSaglayici" TEXT,
    "scadaSaglayici" TEXT,
    "plcAileleri" TEXT,
    "iotVar" BOOLEAN,
    "akilliSayacVar" BOOLEAN,
    "yerelAdVar" BOOLEAN,
    "yerelVeriMerkeziVar" BOOLEAN,
    "grupOrtakServisler" TEXT,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "TesisProfili_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FrameworkSurumu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regulasyonId" TEXT NOT NULL,
    "surumEtiketi" TEXT NOT NULL,
    "yayimTarihi" DATETIME,
    "yururlukTarih" DATETIME,
    "kaynakUrl" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FrameworkSurumu_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SurumFarki" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eskiSurumId" TEXT,
    "yeniSurumId" TEXT NOT NULL,
    "maddeKodu" TEXT NOT NULL,
    "degisimTipi" TEXT NOT NULL,
    "ozet" TEXT,
    "etkiNotu" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurumFarki_eskiSurumId_fkey" FOREIGN KEY ("eskiSurumId") REFERENCES "FrameworkSurumu" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SurumFarki_yeniSurumId_fkey" FOREIGN KEY ("yeniSurumId") REFERENCES "FrameworkSurumu" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UygulanabilirlikKurali" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regulasyonId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "kosulJson" TEXT NOT NULL,
    "surum" INTEGER NOT NULL DEFAULT 1,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "aciklama" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UygulanabilirlikKurali_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UygulanabilirlikKarari" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tesisId" TEXT NOT NULL,
    "regulasyonId" TEXT NOT NULL,
    "uygulanabilir" BOOLEAN NOT NULL,
    "gerekce" TEXT NOT NULL,
    "kuralId" TEXT,
    "kuralSurumu" INTEGER,
    "hesaplandi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elIleDegistirildi" BOOLEAN NOT NULL DEFAULT false,
    "degistirmeGerekcesi" TEXT,
    "onaylayanId" TEXT,
    CONSTRAINT "UygulanabilirlikKarari_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UygulanabilirlikKarari_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UygulanabilirlikKarari_kuralId_fkey" FOREIGN KEY ("kuralId") REFERENCES "UygulanabilirlikKurali" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UygulanabilirlikKarari_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Istisna" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maddeId" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    "gerekce" TEXT NOT NULL,
    "baslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" DATETIME NOT NULL,
    "onaylayanId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'onay_bekliyor',
    CONSTRAINT "Istisna_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Istisna_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Istisna_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DegerlendirmeTarihcesi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maddeDurumuId" TEXT NOT NULL,
    "eskiDurum" TEXT NOT NULL,
    "yeniDurum" TEXT NOT NULL,
    "eskiGuven" TEXT,
    "yeniGuven" TEXT,
    "gerekce" TEXT,
    "aktorId" TEXT,
    "zaman" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DegerlendirmeTarihcesi_maddeDurumuId_fkey" FOREIGN KEY ("maddeDurumuId") REFERENCES "MaddeDurumu" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DegerlendirmeTarihcesi_aktorId_fkey" FOREIGN KEY ("aktorId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UyumAnlik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surecId" TEXT NOT NULL,
    "tesisId" TEXT,
    "tarih" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ozetJson" TEXT NOT NULL,
    CONSTRAINT "UyumAnlik_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UyumAnlik_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL,
    "kaynak" TEXT,
    "tesisId" TEXT,
    "sistemId" TEXT,
    "bulguId" TEXT,
    "tehdit" TEXT,
    "zayiflik" TEXT,
    "olasilik" INTEGER,
    "etkiUretim" INTEGER,
    "etkiEmniyet" INTEGER,
    "etkiRegulasyon" INTEGER,
    "etkiFinans" INTEGER,
    "etkiSiber" INTEGER,
    "etkiItibar" INTEGER,
    "etkiCevre" INTEGER,
    "etkiVeri" INTEGER,
    "dogalRisk" INTEGER,
    "mevcutKontroller" TEXT,
    "artikRisk" INTEGER,
    "sahipId" TEXT,
    "islemTipi" TEXT,
    "islemTarihi" DATETIME,
    "kabulBitis" DATETIME,
    "onaylayanId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "silindi" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "Risk_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Risk_sistemId_fkey" FOREIGN KEY ("sistemId") REFERENCES "SistemServis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Risk_bulguId_fkey" FOREIGN KEY ("bulguId") REFERENCES "Bulgu" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Risk_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Risk_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskVarlik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riskId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    CONSTRAINT "RiskVarlik_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RiskVarlik_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskKontrol" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riskId" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,
    CONSTRAINT "RiskKontrol_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RiskKontrol_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Denetim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "denetleyen" TEXT,
    "surecId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'plan',
    "planBaslangic" DATETIME,
    "planBitis" DATETIME,
    "silindi" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Denetim_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DenetimKapsami" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "denetimId" TEXT NOT NULL,
    "tesisId" TEXT,
    "maddeId" TEXT,
    CONSTRAINT "DenetimKapsami_denetimId_fkey" FOREIGN KEY ("denetimId") REFERENCES "Denetim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DenetimKapsami_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DenetimKapsami_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KanitTalebi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "denetimId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "sorumluId" TEXT,
    "sonTarih" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "kanitId" TEXT,
    CONSTRAINT "KanitTalebi_denetimId_fkey" FOREIGN KEY ("denetimId") REFERENCES "Denetim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KanitTalebi_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KanitTalebi_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VarlikTuru" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "sinif" TEXT NOT NULL DEFAULT 'BT',
    "aktif" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Varlik" (
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
    CONSTRAINT "Varlik_tedarikciId_fkey" FOREIGN KEY ("tedarikciId") REFERENCES "Tedarikci" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Varlik_sozlesmeId_fkey" FOREIGN KEY ("sozlesmeId") REFERENCES "Sozlesme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VarlikIliskisi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynakId" TEXT NOT NULL,
    "hedefId" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    CONSTRAINT "VarlikIliskisi_kaynakId_fkey" FOREIGN KEY ("kaynakId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VarlikIliskisi_hedefId_fkey" FOREIGN KEY ("hedefId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgBolgesi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tesisId" TEXT,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'bt',
    "guvenlikSeviyesi" INTEGER,
    CONSTRAINT "AgBolgesi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgGeciti" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynakBolgeId" TEXT NOT NULL,
    "hedefBolgeId" TEXT NOT NULL,
    "kontrolVarligi" TEXT,
    "protokoller" TEXT,
    "onaylandi" BOOLEAN NOT NULL DEFAULT false,
    "aciklama" TEXT,
    CONSTRAINT "AgGeciti_kaynakBolgeId_fkey" FOREIGN KEY ("kaynakBolgeId") REFERENCES "AgBolgesi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AgGeciti_hedefBolgeId_fkey" FOREIGN KEY ("hedefBolgeId") REFERENCES "AgBolgesi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KimlikHesabi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hesapAdi" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "kullaniciId" TEXT,
    "tesisId" TEXT,
    "kaynakSistem" TEXT,
    "ayricalikli" BOOLEAN NOT NULL DEFAULT false,
    "parolaRotasyon" DATETIME,
    "sonKullanim" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    CONSTRAINT "KimlikHesabi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KimlikHesabi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ErisimAtamasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hesapId" TEXT NOT NULL,
    "varlikId" TEXT,
    "kapsam" TEXT,
    "yetkiSeviyesi" TEXT,
    "verilis" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" DATETIME,
    CONSTRAINT "ErisimAtamasi_hesapId_fkey" FOREIGN KEY ("hesapId") REFERENCES "KimlikHesabi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ErisimAtamasi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ErisimIncelemesi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atamaId" TEXT NOT NULL,
    "inceleyenId" TEXT,
    "sonuc" TEXT NOT NULL,
    "not" TEXT,
    "zaman" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ErisimIncelemesi_atamaId_fkey" FOREIGN KEY ("atamaId") REFERENCES "ErisimAtamasi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ErisimIncelemesi_inceleyenId_fkey" FOREIGN KEY ("inceleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tedarikci" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "tip" TEXT,
    "uzaktanErisimVar" BOOLEAN NOT NULL DEFAULT false,
    "kritiklik" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "silindi" DATETIME
);

-- CreateTable
CREATE TABLE "Sozlesme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tedarikciId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "baslangic" DATETIME,
    "bitis" DATETIME,
    "slaOzeti" TEXT,
    "guvenlikSartlariVar" BOOLEAN,
    "silindi" DATETIME,
    CONSTRAINT "Sozlesme_tedarikciId_fkey" FOREIGN KEY ("tedarikciId") REFERENCES "Tedarikci" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "YazilimUrunu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "uretici" TEXT,
    "surum" TEXT,
    "eolTarihi" DATETIME,
    "eosTarihi" DATETIME
);

-- CreateTable
CREATE TABLE "VarlikYazilimi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varlikId" TEXT NOT NULL,
    "yazilimId" TEXT NOT NULL,
    CONSTRAINT "VarlikYazilimi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VarlikYazilimi_yazilimId_fkey" FOREIGN KEY ("yazilimId") REFERENCES "YazilimUrunu" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lisans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yazilimId" TEXT NOT NULL,
    "sozlesmeId" TEXT,
    "adet" INTEGER,
    "bitis" DATETIME,
    "maliyet" REAL,
    CONSTRAINT "Lisans_yazilimId_fkey" FOREIGN KEY ("yazilimId") REFERENCES "YazilimUrunu" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lisans_sozlesmeId_fkey" FOREIGN KEY ("sozlesmeId") REFERENCES "Sozlesme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sertifika" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "varlikId" TEXT,
    "veren" TEXT,
    "bitis" DATETIME NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'gecerli',
    CONSTRAINT "Sertifika_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Zafiyet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynakRef" TEXT,
    "baslik" TEXT NOT NULL,
    "cvss" REAL,
    "aciklama" TEXT,
    "kesfedildi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VarlikZafiyeti" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zafiyetId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "sonTarih" DATETIME,
    "kapanis" DATETIME,
    CONSTRAINT "VarlikZafiyeti_zafiyetId_fkey" FOREIGN KEY ("zafiyetId") REFERENCES "Zafiyet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VarlikZafiyeti_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "YedeklemePolitikasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "kapsam" TEXT,
    "siklik" TEXT,
    "saklamaGun" INTEGER,
    "hedef" TEXT
);

-- CreateTable
CREATE TABLE "YedeklemeKosusu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "politikaId" TEXT NOT NULL,
    "zaman" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durum" TEXT NOT NULL,
    "boyutMb" REAL,
    "hata" TEXT,
    CONSTRAINT "YedeklemeKosusu_politikaId_fkey" FOREIGN KEY ("politikaId") REFERENCES "YedeklemePolitikasi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeriYuklemeTesti" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kosuId" TEXT NOT NULL,
    "zaman" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonuc" TEXT NOT NULL,
    "sureDk" INTEGER,
    "not" TEXT,
    CONSTRAINT "GeriYuklemeTesti_kosuId_fkey" FOREIGN KEY ("kosuId") REFERENCES "YedeklemeKosusu" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Degisiklik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "tesisId" TEXT,
    "varlikEtiketi" TEXT,
    "otMu" BOOLEAN NOT NULL DEFAULT false,
    "saglayiciOnayi" BOOLEAN,
    "bakimPenceresi" TEXT,
    "geriAlmaPlani" TEXT,
    "onDegisiklikYedegi" BOOLEAN,
    "uretimEtkisi" TEXT,
    "sonDogrulama" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'talep',
    "talepEdenId" TEXT,
    "onaylayanId" TEXT,
    "planTarihi" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Degisiklik_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Degisiklik_talepEdenId_fkey" FOREIGN KEY ("talepEdenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Degisiklik_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Olay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'olay',
    "tesisId" TEXT,
    "siddet" TEXT NOT NULL DEFAULT 'orta',
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "baslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cozum" DATETIME,
    "ozet" TEXT,
    CONSTRAINT "Olay_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Butce" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projeId" TEXT NOT NULL,
    "yil" INTEGER NOT NULL,
    "tip" TEXT NOT NULL,
    "planlanan" REAL NOT NULL,
    "harcanan" REAL NOT NULL DEFAULT 0,
    "paraBirimi" TEXT NOT NULL DEFAULT 'TRY',
    CONSTRAINT "Butce_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "Proje" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KilometreTasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projeId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "hedef" DATETIME NOT NULL,
    "gerceklesen" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'planlandi',
    CONSTRAINT "KilometreTasi_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "Proje" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjeBagimliligi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projeId" TEXT NOT NULL,
    "bagimliProjeId" TEXT NOT NULL,
    CONSTRAINT "ProjeBagimliligi_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "Proje" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjeBagimliligi_bagimliProjeId_fkey" FOREIGN KEY ("bagimliProjeId") REFERENCES "Proje" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjeAdayi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baslik" TEXT NOT NULL,
    "gerekce" TEXT NOT NULL,
    "kaynak" TEXT NOT NULL,
    "kaynakRef" TEXT,
    "tesisId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'oneri',
    "projeId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kararVerenId" TEXT,
    CONSTRAINT "ProjeAdayi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjeAdayi_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "Proje" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjeAdayi_kararVerenId_fkey" FOREIGN KEY ("kararVerenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KanitVarlik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kanitId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    CONSTRAINT "KanitVarlik_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KanitVarlik_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KanitTesis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kanitId" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    CONSTRAINT "KanitTesis_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KanitTesis_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Oturum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kullaniciId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonKullanim" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" DATETIME NOT NULL,
    CONSTRAINT "Oturum_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Gorev" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baslik" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "kaynakTipi" TEXT,
    "kaynakId" TEXT,
    "sorumluId" TEXT,
    "tesisId" TEXT,
    "sonTarih" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "otomatikUretildi" BOOLEAN NOT NULL DEFAULT false,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kapanis" DATETIME,
    CONSTRAINT "Gorev_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Gorev_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bildirim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kullaniciId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "govde" TEXT,
    "tip" TEXT NOT NULL DEFAULT 'bilgi',
    "kaynakTipi" TEXT,
    "kaynakId" TEXT,
    "okundu" DATETIME,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bildirim_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnayTalebi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tip" TEXT NOT NULL,
    "kaynakTipi" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "ozet" TEXT NOT NULL,
    "talepEdenId" TEXT,
    "onaylayanId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'bekliyor',
    "gerekce" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kapanis" DATETIME,
    CONSTRAINT "OnayTalebi_talepEdenId_fkey" FOREIGN KEY ("talepEdenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OnayTalebi_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IsKosusu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isAdi" TEXT NOT NULL,
    "baslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'calisiyor',
    "sureMs" INTEGER,
    "islenen" INTEGER NOT NULL DEFAULT 0,
    "uretilen" INTEGER NOT NULL DEFAULT 0,
    "hata" TEXT,
    "denemeNo" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "EntegrasyonKosusu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynak" TEXT NOT NULL,
    "baslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'calisiyor',
    "kayitSayisi" INTEGER NOT NULL DEFAULT 0,
    "guvenEtiketi" TEXT NOT NULL DEFAULT 'manuel',
    "hata" TEXT
);

-- CreateTable
CREATE TABLE "VeriKalitesiBulgusu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kural" TEXT NOT NULL,
    "kaynakTipi" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kapanis" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Aksiyon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bulguId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "sorumluId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'planlandi',
    "baslangic" DATETIME,
    "hedef" DATETIME,
    "tamamlanma" DATETIME,
    "kokNeden" TEXT,
    "dogrulamaDurumu" TEXT NOT NULL DEFAULT 'gerekmez',
    "dogrulayanId" TEXT,
    "dogrulamaTarihi" DATETIME,
    "etkinlikNotu" TEXT,
    CONSTRAINT "Aksiyon_bulguId_fkey" FOREIGN KEY ("bulguId") REFERENCES "Bulgu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Aksiyon_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Aksiyon_dogrulayanId_fkey" FOREIGN KEY ("dogrulayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Aksiyon" ("aciklama", "baslangic", "baslik", "bulguId", "durum", "hedef", "id", "sorumluId", "tamamlanma") SELECT "aciklama", "baslangic", "baslik", "bulguId", "durum", "hedef", "id", "sorumluId", "tamamlanma" FROM "Aksiyon";
DROP TABLE "Aksiyon";
ALTER TABLE "new_Aksiyon" RENAME TO "Aksiyon";
CREATE TABLE "new_AktiviteKaydi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aktorId" TEXT,
    "varlikTipi" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "eylem" TEXT NOT NULL,
    "alan" TEXT,
    "oncekiDeger" TEXT,
    "yeniDeger" TEXT,
    "gerekce" TEXT,
    "kaynak" TEXT NOT NULL DEFAULT 'ui',
    "korelasyonId" TEXT,
    "dosyaAdi" TEXT,
    "zaman" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AktiviteKaydi_aktorId_fkey" FOREIGN KEY ("aktorId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AktiviteKaydi" ("aktorId", "alan", "dosyaAdi", "eylem", "id", "oncekiDeger", "varlikId", "varlikTipi", "yeniDeger", "zaman") SELECT "aktorId", "alan", "dosyaAdi", "eylem", "id", "oncekiDeger", "varlikId", "varlikTipi", "yeniDeger", "zaman" FROM "AktiviteKaydi";
DROP TABLE "AktiviteKaydi";
ALTER TABLE "new_AktiviteKaydi" RENAME TO "AktiviteKaydi";
CREATE INDEX "AktiviteKaydi_varlikTipi_varlikId_zaman_idx" ON "AktiviteKaydi"("varlikTipi", "varlikId", "zaman");
CREATE TABLE "new_Bulgu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "maddeDurumuId" TEXT NOT NULL,
    "denetimId" TEXT,
    "kokNeden" TEXT,
    "tekrarBulguId" TEXT,
    "retestGerekli" BOOLEAN NOT NULL DEFAULT false,
    "retestSonucu" TEXT,
    "kapanisDogrulayanId" TEXT,
    "kapanisDogrulama" DATETIME,
    "silindi" DATETIME,
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
    CONSTRAINT "Bulgu_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bulgu_denetimId_fkey" FOREIGN KEY ("denetimId") REFERENCES "Denetim" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bulgu_tekrarBulguId_fkey" FOREIGN KEY ("tekrarBulguId") REFERENCES "Bulgu" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bulgu_kapanisDogrulayanId_fkey" FOREIGN KEY ("kapanisDogrulayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Bulgu" ("aciklama", "baslik", "durum", "hedefTarih", "id", "kapanmaTarihi", "kaynak", "maddeDurumuId", "onemDerecesi", "sorumluId", "tespitTarihi") SELECT "aciklama", "baslik", "durum", "hedefTarih", "id", "kapanmaTarihi", "kaynak", "maddeDurumuId", "onemDerecesi", "sorumluId", "tespitTarihi" FROM "Bulgu";
DROP TABLE "Bulgu";
ALTER TABLE "new_Bulgu" RENAME TO "Bulgu";
CREATE INDEX "Bulgu_durum_onemDerecesi_idx" ON "Bulgu"("durum", "onemDerecesi");
CREATE TABLE "new_IceAktarim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regulasyonId" TEXT NOT NULL,
    "surumId" TEXT,
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
    CONSTRAINT "IceAktarim_surumId_fkey" FOREIGN KEY ("surumId") REFERENCES "FrameworkSurumu" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IceAktarim_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_IceAktarim" ("durum", "eklenen", "elenen", "guncellenen", "id", "kaynakAdi", "kaynakTipi", "okunan", "olusturuldu", "raporJson", "regulasyonId", "yukleyenId") SELECT "durum", "eklenen", "elenen", "guncellenen", "id", "kaynakAdi", "kaynakTipi", "okunan", "olusturuldu", "raporJson", "regulasyonId", "yukleyenId" FROM "IceAktarim";
DROP TABLE "IceAktarim";
ALTER TABLE "new_IceAktarim" RENAME TO "IceAktarim";
CREATE TABLE "new_Kanit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "dosyaYolu" TEXT,
    "gecerlilikBaslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "yukleyenId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sahipId" TEXT,
    "kaynakSistem" TEXT,
    "kaynakUrl" TEXT,
    "dosyaHash" TEXT,
    "surum" INTEGER NOT NULL DEFAULT 1,
    "gecerliBitis" DATETIME,
    "toplanmaTarihi" DATETIME,
    "otomatik" BOOLEAN NOT NULL DEFAULT false,
    "gizlilik" TEXT NOT NULL DEFAULT 'kurumsal',
    "silindi" DATETIME,
    CONSTRAINT "Kanit_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Kanit_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Kanit" ("ad", "dosyaYolu", "gecerlilikBaslangic", "id", "olusturuldu", "tip", "yukleyenId") SELECT "ad", "dosyaYolu", "gecerlilikBaslangic", "id", "olusturuldu", "tip", "yukleyenId" FROM "Kanit";
DROP TABLE "Kanit";
ALTER TABLE "new_Kanit" RENAME TO "Kanit";
CREATE TABLE "new_Madde" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regulasyonId" TEXT NOT NULL,
    "ustMaddeId" TEXT,
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "metin" TEXT NOT NULL,
    "kanitTipi" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "surumId" TEXT,
    "disKontrolId" TEXT,
    "alanAdi" TEXT,
    "altAlan" TEXT,
    "olgunlukSeviyesi" INTEGER,
    "zorunlulukTipi" TEXT NOT NULL DEFAULT 'REGULATION',
    "gereksinimTipi" TEXT,
    "kaynakSayfa" TEXT,
    "maddeKaynakUrl" TEXT,
    "gecerliBaslangic" DATETIME,
    "gecerliBitis" DATETIME,
    "yeriniAlanId" TEXT,
    "kanitBeklentisi" TEXT,
    "degerlendirmeRehberi" TEXT,
    "varsayilanIncelemeGunu" INTEGER NOT NULL DEFAULT 180,
    "silindi" DATETIME,
    CONSTRAINT "Madde_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Madde_ustMaddeId_fkey" FOREIGN KEY ("ustMaddeId") REFERENCES "Madde" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Madde_surumId_fkey" FOREIGN KEY ("surumId") REFERENCES "FrameworkSurumu" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Madde_yeriniAlanId_fkey" FOREIGN KEY ("yeriniAlanId") REFERENCES "Madde" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Madde" ("baslik", "id", "kanitTipi", "kod", "metin", "regulasyonId", "sira", "ustMaddeId") SELECT "baslik", "id", "kanitTipi", "kod", "metin", "regulasyonId", "sira", "ustMaddeId" FROM "Madde";
DROP TABLE "Madde";
ALTER TABLE "new_Madde" RENAME TO "Madde";
CREATE UNIQUE INDEX "Madde_regulasyonId_kod_key" ON "Madde"("regulasyonId", "kod");
CREATE TABLE "new_MaddeDurumu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surecId" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'degerlendirilmedi',
    "guven" TEXT NOT NULL DEFAULT 'kanit_yok',
    "kanitBayat" BOOLEAN NOT NULL DEFAULT false,
    "sorumluId" TEXT,
    "not" TEXT,
    "sonDegerlendirme" DATETIME,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "MaddeDurumu_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaddeDurumu_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MaddeDurumu" ("durum", "guncellendi", "id", "maddeId", "not", "sonDegerlendirme", "sorumluId", "surecId", "tesisId") SELECT "durum", "guncellendi", "id", "maddeId", "not", "sonDegerlendirme", "sorumluId", "surecId", "tesisId" FROM "MaddeDurumu";
DROP TABLE "MaddeDurumu";
ALTER TABLE "new_MaddeDurumu" RENAME TO "MaddeDurumu";
CREATE INDEX "MaddeDurumu_surecId_tesisId_durum_idx" ON "MaddeDurumu"("surecId", "tesisId", "durum");
CREATE UNIQUE INDEX "MaddeDurumu_surecId_maddeId_tesisId_key" ON "MaddeDurumu"("surecId", "maddeId", "tesisId");
CREATE TABLE "new_Proje" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT,
    "tip" TEXT NOT NULL DEFAULT 'iyilestirme',
    "gerekce" TEXT,
    "silindi" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'planlandi',
    "baslangic" DATETIME,
    "hedef" DATETIME,
    "sahipId" TEXT,
    CONSTRAINT "Proje_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Proje" ("aciklama", "ad", "baslangic", "durum", "hedef", "id", "kod", "sahipId") SELECT "aciklama", "ad", "baslangic", "durum", "hedef", "id", "kod", "sahipId" FROM "Proje";
DROP TABLE "Proje";
ALTER TABLE "new_Proje" RENAME TO "Proje";
CREATE UNIQUE INDEX "Proje_kod_key" ON "Proje"("kod");
CREATE TABLE "new_ProjeBaglantisi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projeId" TEXT NOT NULL,
    "maddeId" TEXT,
    "bulguId" TEXT,
    "riskId" TEXT,
    "tesisId" TEXT,
    "varlikId" TEXT,
    "gerekce" TEXT,
    CONSTRAINT "ProjeBaglantisi_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "Proje" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjeBaglantisi_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjeBaglantisi_bulguId_fkey" FOREIGN KEY ("bulguId") REFERENCES "Bulgu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjeBaglantisi_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjeBaglantisi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjeBaglantisi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProjeBaglantisi" ("bulguId", "id", "maddeId", "projeId") SELECT "bulguId", "id", "maddeId", "projeId" FROM "ProjeBaglantisi";
DROP TABLE "ProjeBaglantisi";
ALTER TABLE "new_ProjeBaglantisi" RENAME TO "ProjeBaglantisi";
CREATE UNIQUE INDEX "ProjeBaglantisi_projeId_maddeId_bulguId_riskId_tesisId_varlikId_key" ON "ProjeBaglantisi"("projeId", "maddeId", "bulguId", "riskId", "tesisId", "varlikId");
CREATE TABLE "new_Tesis" (
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
    "tuzelKisiId" TEXT,
    CONSTRAINT "Tesis_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "TesisTipi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tesis_tuzelKisiId_fkey" FOREIGN KEY ("tuzelKisiId") REFERENCES "TuzelKisi" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tesis" ("ad", "devreyeGiris", "durum", "id", "kapanisNedeni", "kapanisTarihi", "kod", "konum", "kuruluGucMw", "olusturuldu", "tipId") SELECT "ad", "devreyeGiris", "durum", "id", "kapanisNedeni", "kapanisTarihi", "kod", "konum", "kuruluGucMw", "olusturuldu", "tipId" FROM "Tesis";
DROP TABLE "Tesis";
ALTER TABLE "new_Tesis" RENAME TO "Tesis";
CREATE UNIQUE INDEX "Tesis_kod_key" ON "Tesis"("kod");
CREATE TABLE "new_Yetki" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kullaniciId" TEXT NOT NULL,
    "surecId" TEXT,
    "tesisId" TEXT,
    "tuzelKisiId" TEXT,
    "regulasyonId" TEXT,
    "modul" TEXT,
    "rol" TEXT NOT NULL,
    CONSTRAINT "Yetki_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Yetki_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Yetki_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Yetki_tuzelKisiId_fkey" FOREIGN KEY ("tuzelKisiId") REFERENCES "TuzelKisi" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Yetki" ("id", "kullaniciId", "rol", "surecId", "tesisId") SELECT "id", "kullaniciId", "rol", "surecId", "tesisId" FROM "Yetki";
DROP TABLE "Yetki";
ALTER TABLE "new_Yetki" RENAME TO "Yetki";
CREATE UNIQUE INDEX "Yetki_kullaniciId_surecId_tesisId_tuzelKisiId_regulasyonId_modul_key" ON "Yetki"("kullaniciId", "surecId", "tesisId", "tuzelKisiId", "regulasyonId", "modul");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Grup_kod_key" ON "Grup"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "TuzelKisi_kod_key" ON "TuzelKisi"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "UretimUnitesi_tesisId_kod_key" ON "UretimUnitesi"("tesisId", "kod");

-- CreateIndex
CREATE UNIQUE INDEX "SistemServis_kod_key" ON "SistemServis"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "IsSureci_kod_key" ON "IsSureci"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "IsSureciSistemi_surecId_sistemId_key" ON "IsSureciSistemi"("surecId", "sistemId");

-- CreateIndex
CREATE UNIQUE INDEX "TesisProfili_tesisId_key" ON "TesisProfili"("tesisId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkSurumu_regulasyonId_surumEtiketi_key" ON "FrameworkSurumu"("regulasyonId", "surumEtiketi");

-- CreateIndex
CREATE UNIQUE INDEX "UygulanabilirlikKarari_tesisId_regulasyonId_key" ON "UygulanabilirlikKarari"("tesisId", "regulasyonId");

-- CreateIndex
CREATE INDEX "DegerlendirmeTarihcesi_maddeDurumuId_zaman_idx" ON "DegerlendirmeTarihcesi"("maddeDurumuId", "zaman");

-- CreateIndex
CREATE INDEX "UyumAnlik_surecId_tarih_idx" ON "UyumAnlik"("surecId", "tarih");

-- CreateIndex
CREATE UNIQUE INDEX "Risk_kod_key" ON "Risk"("kod");

-- CreateIndex
CREATE INDEX "Risk_durum_tesisId_idx" ON "Risk"("durum", "tesisId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskVarlik_riskId_varlikId_key" ON "RiskVarlik"("riskId", "varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskKontrol_riskId_maddeId_key" ON "RiskKontrol"("riskId", "maddeId");

-- CreateIndex
CREATE UNIQUE INDEX "Denetim_kod_key" ON "Denetim"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "VarlikTuru_kod_key" ON "VarlikTuru"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "Varlik_etiket_key" ON "Varlik"("etiket");

-- CreateIndex
CREATE INDEX "Varlik_tesisId_kritiklik_idx" ON "Varlik"("tesisId", "kritiklik");

-- CreateIndex
CREATE INDEX "Varlik_eosTarihi_idx" ON "Varlik"("eosTarihi");

-- CreateIndex
CREATE UNIQUE INDEX "VarlikIliskisi_kaynakId_hedefId_tip_key" ON "VarlikIliskisi"("kaynakId", "hedefId", "tip");

-- CreateIndex
CREATE UNIQUE INDEX "AgBolgesi_kod_key" ON "AgBolgesi"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "AgGeciti_kaynakBolgeId_hedefBolgeId_key" ON "AgGeciti"("kaynakBolgeId", "hedefBolgeId");

-- CreateIndex
CREATE UNIQUE INDEX "KimlikHesabi_hesapAdi_key" ON "KimlikHesabi"("hesapAdi");

-- CreateIndex
CREATE UNIQUE INDEX "Tedarikci_ad_key" ON "Tedarikci"("ad");

-- CreateIndex
CREATE UNIQUE INDEX "Sozlesme_kod_key" ON "Sozlesme"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "YazilimUrunu_ad_surum_key" ON "YazilimUrunu"("ad", "surum");

-- CreateIndex
CREATE UNIQUE INDEX "VarlikYazilimi_varlikId_yazilimId_key" ON "VarlikYazilimi"("varlikId", "yazilimId");

-- CreateIndex
CREATE UNIQUE INDEX "VarlikZafiyeti_zafiyetId_varlikId_key" ON "VarlikZafiyeti"("zafiyetId", "varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "Degisiklik_kod_key" ON "Degisiklik"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "Olay_kod_key" ON "Olay"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "Butce_projeId_yil_tip_key" ON "Butce"("projeId", "yil", "tip");

-- CreateIndex
CREATE UNIQUE INDEX "ProjeBagimliligi_projeId_bagimliProjeId_key" ON "ProjeBagimliligi"("projeId", "bagimliProjeId");

-- CreateIndex
CREATE UNIQUE INDEX "KanitVarlik_kanitId_varlikId_key" ON "KanitVarlik"("kanitId", "varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "KanitTesis_kanitId_tesisId_key" ON "KanitTesis"("kanitId", "tesisId");

-- CreateIndex
CREATE UNIQUE INDEX "Oturum_tokenHash_key" ON "Oturum"("tokenHash");

-- CreateIndex
CREATE INDEX "Oturum_kullaniciId_idx" ON "Oturum"("kullaniciId");

-- CreateIndex
CREATE INDEX "Gorev_durum_sonTarih_idx" ON "Gorev"("durum", "sonTarih");

-- CreateIndex
CREATE INDEX "Bildirim_kullaniciId_okundu_idx" ON "Bildirim"("kullaniciId", "okundu");

-- CreateIndex
CREATE INDEX "OnayTalebi_durum_tip_idx" ON "OnayTalebi"("durum", "tip");

-- CreateIndex
CREATE INDEX "IsKosusu_isAdi_baslangic_idx" ON "IsKosusu"("isAdi", "baslangic");

-- CreateIndex
CREATE INDEX "VeriKalitesiBulgusu_kural_durum_idx" ON "VeriKalitesiBulgusu"("kural", "durum");
