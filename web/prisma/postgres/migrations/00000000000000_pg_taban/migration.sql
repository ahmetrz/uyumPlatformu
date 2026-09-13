-- PostgreSQL TABAN GÖÇÜ — ÜRETİLMİŞTİR, elle düzenlenmez.
-- Üreteç: `node arac/pg-taban.mjs --yaz` (kaynak: prisma/schema.prisma).
-- Sonuna prisma/postgres/elle-yazilan.sql eklenir (tetikleyiciler + elle indeksler).
-- Tazelik kapısı: `npm run kapi:pg-taban` — şema değişip taban güncellenmezse KIRMIZI.
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Sektor" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sektor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KapsamOgesiTuru" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "etiketAnahtari" TEXT,
    "sektorId" TEXT,
    "tesiseBagli" BOOLEAN NOT NULL DEFAULT false,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,

    CONSTRAINT "KapsamOgesiTuru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KapsamOgesi" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "turId" TEXT NOT NULL,
    "tesisId" TEXT,
    "ustId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KapsamOgesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TesisTipi" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "sektorId" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "varsayilanKapsamTuruId" TEXT,

    CONSTRAINT "TesisTipi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SektorOznitelikSemasi" (
    "id" TEXT NOT NULL,
    "sektorId" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "etiketAnahtari" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'sayi',
    "rol" TEXT,
    "birim" TEXT,
    "kuraldaKullanilir" BOOLEAN NOT NULL DEFAULT false,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "grup" TEXT,
    "secenekler" TEXT,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SektorOznitelikSemasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SektorSozlugu" (
    "id" TEXT NOT NULL,
    "sektorId" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "dil" TEXT NOT NULL DEFAULT 'tr',
    "tekil" TEXT NOT NULL,
    "cogul" TEXT,
    "iyelik" TEXT,
    "belirtme" TEXT,
    "bulunma" TEXT,
    "yonelme" TEXT,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SektorSozlugu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TesisOzellik" (
    "id" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "sayisalDeger" DOUBLE PRECISION,
    "metinDeger" TEXT,
    "birim" TEXT,
    "kaynak" TEXT,
    "olcumZamani" TIMESTAMP(3),
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TesisOzellik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BirimOzellik" (
    "id" TEXT NOT NULL,
    "birimId" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "sayisalDeger" DOUBLE PRECISION,
    "metinDeger" TEXT,
    "birim" TEXT,
    "kaynak" TEXT,
    "olcumZamani" TIMESTAMP(3),
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BirimOzellik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tesis" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tipId" TEXT,
    "konum" TEXT,
    "enlem" DOUBLE PRECISION,
    "boylam" DOUBLE PRECISION,
    "konumKaynagi" TEXT,
    "konumDogrulandi" BOOLEAN NOT NULL DEFAULT false,
    "konumDogrulayanId" TEXT,
    "konumDogrulandiZaman" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    "devreyeGiris" TIMESTAMP(3),
    "kapanisTarihi" TIMESTAMP(3),
    "kapanisNedeni" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gorselAnahtari" TEXT,
    "tuzelKisiId" TEXT,

    CONSTRAINT "Tesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regulasyon" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "surum" TEXT,
    "yururlukTarih" TIMESTAMP(3),
    "kaynakUrl" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "lisansTuru" TEXT,
    "metinDahil" BOOLEAN,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,

    CONSTRAINT "Regulasyon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KapsamAlani" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KapsamAlani_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Madde" (
    "id" TEXT NOT NULL,
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
    "kaynakErisimTarihi" TIMESTAMP(3),
    "gecerliBaslangic" TIMESTAMP(3),
    "gecerliBitis" TIMESTAMP(3),
    "yeriniAlanId" TEXT,
    "kanitBeklentisi" TEXT,
    "degerlendirmeRehberi" TEXT,
    "varsayilanIncelemeGunu" INTEGER NOT NULL DEFAULT 180,
    "silindi" TIMESTAMP(3),

    CONSTRAINT "Madde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaddeAlan" (
    "id" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,
    "alanId" TEXT NOT NULL,

    CONSTRAINT "MaddeAlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UyumSureci" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "regulasyonId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'planlandi',
    "baslangic" TIMESTAMP(3),
    "bitis" TIMESTAMP(3),
    "aciklama" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UyumSureci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurecKapsami" (
    "id" TEXT NOT NULL,
    "surecId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,
    "eklendi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurecKapsami_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaddeDurumu" (
    "id" TEXT NOT NULL,
    "surecId" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'degerlendirilmedi',
    "guven" TEXT NOT NULL DEFAULT 'kanit_yok',
    "kanitBayat" BOOLEAN NOT NULL DEFAULT false,
    "sorumluId" TEXT,
    "ekipId" TEXT,
    "dogrulayanId" TEXT,
    "dogrulamaZamani" TIMESTAMP(3),
    "not" TEXT,
    "olgunlukSeviyesi" INTEGER,
    "sonDegerlendirme" TIMESTAMP(3),
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaddeDurumu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bulgu" (
    "id" TEXT NOT NULL,
    "maddeDurumuId" TEXT NOT NULL,
    "denetimId" TEXT,
    "kokNeden" TEXT,
    "kokNedenKategori" TEXT,
    "kokNedenAnalizEdenId" TEXT,
    "kokNedenAnalizZamani" TIMESTAMP(3),
    "tekrarBulguId" TEXT,
    "tekrarKaynagi" TEXT,
    "tekrarPenceresiGun" INTEGER,
    "retestGerekli" BOOLEAN NOT NULL DEFAULT false,
    "retestSonucu" TEXT,
    "kapanisDogrulayanId" TEXT,
    "kapanisDogrulama" TIMESTAMP(3),
    "silindi" TIMESTAMP(3),
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL,
    "onemDerecesi" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "kaynak" TEXT,
    "tespitTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hedefTarih" TIMESTAMP(3),
    "kapanmaTarihi" TIMESTAMP(3),
    "sorumluId" TEXT,

    CONSTRAINT "Bulgu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aksiyon" (
    "id" TEXT NOT NULL,
    "bulguId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "sorumluId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'planlandi',
    "baslangic" TIMESTAMP(3),
    "hedef" TIMESTAMP(3),
    "tamamlanma" TIMESTAMP(3),
    "kokNeden" TEXT,
    "dogrulamaDurumu" TEXT NOT NULL DEFAULT 'gerekmez',
    "dogrulayanId" TEXT,
    "dogrulamaTarihi" TIMESTAMP(3),
    "etkinlikNotu" TEXT,

    CONSTRAINT "Aksiyon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kanit" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "dosyaYolu" TEXT,
    "gecerlilikBaslangic" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "yukleyenId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sahipId" TEXT,
    "kaynakSistem" TEXT,
    "kaynakUrl" TEXT,
    "dosyaHash" TEXT,
    "surum" INTEGER NOT NULL DEFAULT 1,
    "gecerliBitis" TIMESTAMP(3),
    "toplanmaTarihi" TIMESTAMP(3),
    "otomatik" BOOLEAN NOT NULL DEFAULT false,
    "gizlilik" TEXT NOT NULL DEFAULT 'kurumsal',
    "durum" TEXT NOT NULL DEFAULT 'gecerli',
    "dosyaAdi" TEXT,
    "dosyaTipi" TEXT,
    "dosyaBoyut" INTEGER,
    "depoAnahtari" TEXT,
    "depoSaglayici" TEXT,
    "silindi" TIMESTAMP(3),
    "dokumanId" TEXT,

    CONSTRAINT "Kanit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanitSurumu" (
    "id" TEXT NOT NULL,
    "kanitId" TEXT NOT NULL,
    "surum" INTEGER NOT NULL,
    "dosyaHash" TEXT,
    "dosyaAdi" TEXT,
    "dosyaBoyut" INTEGER,
    "depoAnahtari" TEXT,
    "gerekce" TEXT NOT NULL,
    "yukleyenId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanitSurumu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanitBaglantisi" (
    "id" TEXT NOT NULL,
    "kanitId" TEXT NOT NULL,
    "maddeDurumuId" TEXT NOT NULL,
    "eklendi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanitBaglantisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaddeEslestirmesi" (
    "id" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "hedefId" TEXT NOT NULL,
    "denklik" TEXT NOT NULL,
    "aciklama" TEXT,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MaddeEslestirmesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proje" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT,
    "tip" TEXT NOT NULL DEFAULT 'iyilestirme',
    "gerekce" TEXT,
    "silindi" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'planlandi',
    "baslangic" TIMESTAMP(3),
    "hedef" TIMESTAMP(3),
    "sahipId" TEXT,

    CONSTRAINT "Proje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjeBaglantisi" (
    "id" TEXT NOT NULL,
    "projeId" TEXT NOT NULL,
    "maddeId" TEXT,
    "bulguId" TEXT,
    "riskId" TEXT,
    "tesisId" TEXT,
    "varlikId" TEXT,
    "gerekce" TEXT,

    CONSTRAINT "ProjeBaglantisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kullanici" (
    "id" TEXT NOT NULL,
    "eposta" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "unvan" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "parolaHash" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kullanici_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Yetki" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "surecId" TEXT,
    "kapsamOgesiId" TEXT,
    "tuzelKisiId" TEXT,
    "regulasyonId" TEXT,
    "modul" TEXT,
    "rol" TEXT NOT NULL,

    CONSTRAINT "Yetki_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AktiviteKaydi" (
    "id" TEXT NOT NULL,
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
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AktiviteKaydi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IceAktarim" (
    "id" TEXT NOT NULL,
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
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IceAktarim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grup" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TuzelKisi" (
    "id" TEXT NOT NULL,
    "grupId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "vergiNo" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TuzelKisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperasyonelBirim" (
    "id" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "devreyeGiris" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'aktif',

    CONSTRAINT "OperasyonelBirim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SistemServis" (
    "id" TEXT NOT NULL,
    "tesisId" TEXT,
    "birimId" TEXT,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'sistem',
    "aciklama" TEXT,
    "kritiklik" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "sahipId" TEXT,
    "ekipId" TEXT,

    CONSTRAINT "SistemServis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsSureci" (
    "id" TEXT NOT NULL,
    "tesisId" TEXT,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "uretimEtkisi" TEXT NOT NULL DEFAULT 'bilinmiyor',

    CONSTRAINT "IsSureci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsSureciSistemi" (
    "id" TEXT NOT NULL,
    "surecId" TEXT NOT NULL,
    "sistemId" TEXT NOT NULL,

    CONSTRAINT "IsSureciSistemi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TesisProfili" (
    "id" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
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
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TesisProfili_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkSurumu" (
    "id" TEXT NOT NULL,
    "regulasyonId" TEXT NOT NULL,
    "surumEtiketi" TEXT NOT NULL,
    "yayimTarihi" TIMESTAMP(3),
    "yururlukTarih" TIMESTAMP(3),
    "kaynakUrl" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "paketNotu" TEXT,
    "temsili" BOOLEAN NOT NULL DEFAULT false,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,

    CONSTRAINT "FrameworkSurumu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurumFarki" (
    "id" TEXT NOT NULL,
    "eskiSurumId" TEXT,
    "yeniSurumId" TEXT NOT NULL,
    "maddeKodu" TEXT NOT NULL,
    "degisimTipi" TEXT NOT NULL,
    "ozet" TEXT,
    "etkiNotu" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurumFarki_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EskalasyonKurali" (
    "id" TEXT NOT NULL,
    "kaynakTipi" TEXT NOT NULL,
    "onemDerecesi" TEXT,
    "kademe" INTEGER NOT NULL,
    "gecikmeGun" INTEGER NOT NULL,
    "hedefTuru" TEXT NOT NULL,
    "hedefDeger" TEXT,
    "aciklama" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EskalasyonKurali_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EskalasyonKaydi" (
    "id" TEXT NOT NULL,
    "kuralId" TEXT NOT NULL,
    "kaynakTipi" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "kademe" INTEGER NOT NULL,
    "bildirimId" TEXT,
    "hedefKullaniciId" TEXT,
    "sebep" TEXT,
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EskalasyonKaydi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulasyonKaynagi" (
    "id" TEXT NOT NULL,
    "regulasyonId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "adres" TEXT,
    "izlemeTuru" TEXT NOT NULL DEFAULT 'elle',
    "kontrolAraligiGun" INTEGER NOT NULL DEFAULT 90,
    "sonKontrol" TIMESTAMP(3),
    "sonKontrolEdenId" TEXT,
    "sonNot" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegulasyonKaynagi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DegerlendirmeAktarimi" (
    "id" TEXT NOT NULL,
    "regulasyonId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,
    "surecId" TEXT,
    "kaynakAdi" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'kuru_kosu',
    "okunan" INTEGER NOT NULL DEFAULT 0,
    "eslesen" INTEGER NOT NULL DEFAULT 0,
    "elenen" INTEGER NOT NULL DEFAULT 0,
    "degisen" INTEGER NOT NULL DEFAULT 0,
    "raporJson" TEXT,
    "kuruKosuId" TEXT,
    "yukleyenId" TEXT,
    "uygulandi" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DegerlendirmeAktarimi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaklamaPolitikasi" (
    "id" TEXT NOT NULL,
    "varlikTipi" TEXT NOT NULL,
    "saklamaGun" INTEGER,
    "sureSonu" TEXT NOT NULL DEFAULT 'oner',
    "dayanak" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleyenId" TEXT,

    CONSTRAINT "SaklamaPolitikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalHold" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "varlikTipi" TEXT NOT NULL,
    "varlikId" TEXT,
    "tesisId" TEXT,
    "gerekce" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    "koyanId" TEXT NOT NULL,
    "konuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kaldiranId" TEXT,
    "kaldirildi" TIMESTAMP(3),
    "kaldirmaGerekcesi" TEXT,

    CONSTRAINT "LegalHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImhaKarari" (
    "id" TEXT NOT NULL,
    "politikaId" TEXT NOT NULL,
    "varlikTipi" TEXT NOT NULL,
    "kapsananSayi" INTEGER NOT NULL,
    "donemBaslangic" TIMESTAMP(3),
    "donemBitis" TIMESTAMP(3),
    "gerekce" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'oneri',
    "onerenId" TEXT NOT NULL,
    "onaylayanId" TEXT,
    "onaylandi" TIMESTAMP(3),
    "uygulandi" TIMESTAMP(3),
    "silinenSayi" INTEGER,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImhaKarari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DenetciErisimi" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "denetimId" TEXT,
    "firma" TEXT NOT NULL,
    "baslangic" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" TIMESTAMP(3) NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    "davetEdenId" TEXT NOT NULL,
    "iptalEdenId" TEXT,
    "iptalZamani" TIMESTAMP(3),
    "iptalGerekcesi" TEXT,
    "sonErisim" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DenetciErisimi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DenetciKapsami" (
    "id" TEXT NOT NULL,
    "erisimId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,

    CONSTRAINT "DenetciKapsami_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UygulanabilirlikKurali" (
    "id" TEXT NOT NULL,
    "regulasyonId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "kosulJson" TEXT NOT NULL,
    "surum" INTEGER NOT NULL DEFAULT 1,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "aciklama" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,

    CONSTRAINT "UygulanabilirlikKurali_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UygulanabilirlikKarari" (
    "id" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,
    "regulasyonId" TEXT NOT NULL,
    "uygulanabilir" BOOLEAN NOT NULL,
    "gerekce" TEXT NOT NULL,
    "kuralId" TEXT,
    "kuralSurumu" INTEGER,
    "hesaplandi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elIleDegistirildi" BOOLEAN NOT NULL DEFAULT false,
    "degistirmeGerekcesi" TEXT,
    "onaylayanId" TEXT,

    CONSTRAINT "UygulanabilirlikKarari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Istisna" (
    "id" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,
    "gerekce" TEXT NOT NULL,
    "baslangic" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" TIMESTAMP(3) NOT NULL,
    "onaylayanId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'onay_bekliyor',

    CONSTRAINT "Istisna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DegerlendirmeTarihcesi" (
    "id" TEXT NOT NULL,
    "maddeDurumuId" TEXT NOT NULL,
    "eskiDurum" TEXT NOT NULL,
    "yeniDurum" TEXT NOT NULL,
    "eskiGuven" TEXT,
    "yeniGuven" TEXT,
    "gerekce" TEXT,
    "aktorId" TEXT,
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DegerlendirmeTarihcesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UyumAnlik" (
    "id" TEXT NOT NULL,
    "surecId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ozetJson" TEXT NOT NULL,

    CONSTRAINT "UyumAnlik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
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
    "islemTarihi" TIMESTAMP(3),
    "kabulBitis" TIMESTAMP(3),
    "onaylayanId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "silindi" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskVarlik" (
    "id" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,

    CONSTRAINT "RiskVarlik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskKontrol" (
    "id" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,

    CONSTRAINT "RiskKontrol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Denetim" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "denetleyen" TEXT,
    "surecId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'plan',
    "planBaslangic" TIMESTAMP(3),
    "planBitis" TIMESTAMP(3),
    "silindi" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Denetim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DenetimKapsami" (
    "id" TEXT NOT NULL,
    "denetimId" TEXT NOT NULL,
    "tesisId" TEXT,
    "maddeId" TEXT,

    CONSTRAINT "DenetimKapsami_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanitTalebi" (
    "id" TEXT NOT NULL,
    "denetimId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "sorumluId" TEXT,
    "sonTarih" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "kanitId" TEXT,

    CONSTRAINT "KanitTalebi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dokuman" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "surum" TEXT NOT NULL DEFAULT '1.0',
    "sahipId" TEXT,
    "onaylayanId" TEXT,
    "yururlukTarihi" TIMESTAMP(3),
    "gozdenGecirmeAy" INTEGER,
    "sonGozdenGecirme" TIMESTAMP(3),
    "sonrakiGozdenGecirme" TIMESTAMP(3),
    "disKaynak" TEXT,
    "kaynakSistem" TEXT,
    "gizlilik" TEXT NOT NULL DEFAULT 'kurumsal',
    "aciklama" TEXT,
    "silindi" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dokuman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DokumanMadde" (
    "id" TEXT NOT NULL,
    "dokumanId" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,
    "eklendi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DokumanMadde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DokumanTesis" (
    "id" TEXT NOT NULL,
    "dokumanId" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,

    CONSTRAINT "DokumanTesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarlikTuru" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "sinif" TEXT NOT NULL DEFAULT 'BT',
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VarlikTuru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Varlik" (
    "id" TEXT NOT NULL,
    "etiket" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "turId" TEXT NOT NULL,
    "tesisId" TEXT,
    "birimId" TEXT,
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
    "kurulumTarihi" TIMESTAMP(3),
    "garantiBitis" TIMESTAMP(3),
    "garantiSaglayici" TEXT,
    "destekBitis" TIMESTAMP(3),
    "bakimBitis" TIMESTAMP(3),
    "sonBakim" TIMESTAMP(3),
    "sonrakiBakim" TIMESTAMP(3),
    "eolTarihi" TIMESTAMP(3),
    "eosTarihi" TIMESTAMP(3),
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
    "silindi" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Varlik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarlikIliskisi" (
    "id" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "hedefId" TEXT NOT NULL,
    "tip" TEXT NOT NULL,

    CONSTRAINT "VarlikIliskisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgBolgesi" (
    "id" TEXT NOT NULL,
    "tesisId" TEXT,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'bt',
    "guvenlikSeviyesi" INTEGER,

    CONSTRAINT "AgBolgesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgGeciti" (
    "id" TEXT NOT NULL,
    "kaynakBolgeId" TEXT NOT NULL,
    "hedefBolgeId" TEXT NOT NULL,
    "kontrolVarligi" TEXT,
    "protokoller" TEXT,
    "onaylandi" BOOLEAN NOT NULL DEFAULT false,
    "sonDogrulama" TIMESTAMP(3),
    "aciklama" TEXT,

    CONSTRAINT "AgGeciti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KimlikHesabi" (
    "id" TEXT NOT NULL,
    "hesapAdi" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "kullaniciId" TEXT,
    "tesisId" TEXT,
    "kaynakSistem" TEXT,
    "ayricalikli" BOOLEAN,
    "kaynakTipi" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "mfaVar" BOOLEAN,
    "sonaErme" TIMESTAMP(3),
    "parolaPolitikasi" TEXT,
    "parolaRotasyon" TIMESTAMP(3),
    "sonKullanim" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'aktif',

    CONSTRAINT "KimlikHesabi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErisimAtamasi" (
    "id" TEXT NOT NULL,
    "hesapId" TEXT NOT NULL,
    "varlikId" TEXT,
    "kapsam" TEXT,
    "yetkiSeviyesi" TEXT,
    "verilis" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" TIMESTAMP(3),

    CONSTRAINT "ErisimAtamasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErisimIncelemesi" (
    "id" TEXT NOT NULL,
    "atamaId" TEXT NOT NULL,
    "inceleyenId" TEXT,
    "sonuc" TEXT NOT NULL,
    "not" TEXT,
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErisimIncelemesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tedarikci" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT,
    "uzaktanErisimVar" BOOLEAN NOT NULL DEFAULT false,
    "uzaktanErisimYontemi" TEXT,
    "oturumKaydiVar" BOOLEAN,
    "kritiklik" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "silindi" TIMESTAMP(3),

    CONSTRAINT "Tedarikci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sozlesme" (
    "id" TEXT NOT NULL,
    "tedarikciId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "baslangic" TIMESTAMP(3),
    "bitis" TIMESTAMP(3),
    "slaOzeti" TEXT,
    "guvenlikSartlariVar" BOOLEAN,
    "silindi" TIMESTAMP(3),

    CONSTRAINT "Sozlesme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YazilimUrunu" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "uretici" TEXT,
    "surum" TEXT,
    "eolTarihi" TIMESTAMP(3),
    "eosTarihi" TIMESTAMP(3),

    CONSTRAINT "YazilimUrunu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarlikYazilimi" (
    "id" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "yazilimId" TEXT NOT NULL,

    CONSTRAINT "VarlikYazilimi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lisans" (
    "id" TEXT NOT NULL,
    "yazilimId" TEXT NOT NULL,
    "sozlesmeId" TEXT,
    "adet" INTEGER,
    "bitis" TIMESTAMP(3),
    "maliyet" DOUBLE PRECISION,

    CONSTRAINT "Lisans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sertifika" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "varlikId" TEXT,
    "veren" TEXT,
    "bitis" TIMESTAMP(3) NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'gecerli',

    CONSTRAINT "Sertifika_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zafiyet" (
    "id" TEXT NOT NULL,
    "kaynakRef" TEXT,
    "baslik" TEXT NOT NULL,
    "cvss" DOUBLE PRECISION,
    "cvssVektor" TEXT,
    "cvssSurumu" TEXT,
    "cpe" TEXT,
    "istismarDurumu" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "kevMi" BOOLEAN,
    "epss" DOUBLE PRECISION,
    "aciklama" TEXT,
    "kesfedildi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zafiyet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarlikZafiyeti" (
    "id" TEXT NOT NULL,
    "zafiyetId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "sonTarih" TIMESTAMP(3),
    "kapanis" TIMESTAMP(3),

    CONSTRAINT "VarlikZafiyeti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YedeklemePolitikasi" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "kapsam" TEXT,
    "siklik" TEXT,
    "saklamaGun" INTEGER,
    "hedef" TEXT,
    "rpoSaat" INTEGER,
    "rtoSaat" INTEGER,
    "haricTutulan" TEXT,

    CONSTRAINT "YedeklemePolitikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YedeklemeKosusu" (
    "id" TEXT NOT NULL,
    "politikaId" TEXT NOT NULL,
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durum" TEXT NOT NULL,
    "boyutMb" DOUBLE PRECISION,
    "hata" TEXT,

    CONSTRAINT "YedeklemeKosusu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeriYuklemeTesti" (
    "id" TEXT NOT NULL,
    "kosuId" TEXT NOT NULL,
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonuc" TEXT NOT NULL,
    "sureDk" INTEGER,
    "not" TEXT,

    CONSTRAINT "GeriYuklemeTesti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Degisiklik" (
    "id" TEXT NOT NULL,
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
    "planTarihi" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Degisiklik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Olay" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'olay',
    "tesisId" TEXT,
    "siddet" TEXT NOT NULL DEFAULT 'orta',
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "baslangic" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cozum" TIMESTAMP(3),
    "ozet" TEXT,
    "tespitKaynagi" TEXT,
    "uretimEtkisi" TEXT,
    "emniyetEtkisi" TEXT,
    "regulasyonEtkisi" TEXT,
    "siberEtki" TEXT,
    "kokNeden" TEXT,
    "sinirlama" TEXT,
    "kurtarma" TEXT,
    "ogrenilenler" TEXT,
    "bildirimGerekli" BOOLEAN,
    "bildirimTarihi" TIMESTAMP(3),
    "kisiselVeriIhlali" BOOLEAN,
    "etkiOnerisiJson" TEXT,
    "etkiDogrulayanId" TEXT,
    "etkiDogrulamaZamani" TIMESTAMP(3),

    CONSTRAINT "Olay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Butce" (
    "id" TEXT NOT NULL,
    "projeId" TEXT NOT NULL,
    "yil" INTEGER NOT NULL,
    "tip" TEXT NOT NULL,
    "planlanan" DOUBLE PRECISION NOT NULL,
    "harcanan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paraBirimi" TEXT NOT NULL DEFAULT 'TRY',

    CONSTRAINT "Butce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KilometreTasi" (
    "id" TEXT NOT NULL,
    "projeId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "hedef" TIMESTAMP(3) NOT NULL,
    "gerceklesen" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'planlandi',

    CONSTRAINT "KilometreTasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjeBagimliligi" (
    "id" TEXT NOT NULL,
    "projeId" TEXT NOT NULL,
    "bagimliProjeId" TEXT NOT NULL,

    CONSTRAINT "ProjeBagimliligi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjeAdayi" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "gerekce" TEXT NOT NULL,
    "kaynak" TEXT NOT NULL,
    "kaynakRef" TEXT,
    "tesisId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'oneri',
    "projeId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kararVerenId" TEXT,

    CONSTRAINT "ProjeAdayi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanitVarlik" (
    "id" TEXT NOT NULL,
    "kanitId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,

    CONSTRAINT "KanitVarlik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanitKapsami" (
    "id" TEXT NOT NULL,
    "kanitId" TEXT NOT NULL,
    "kapsamOgesiId" TEXT NOT NULL,

    CONSTRAINT "KanitKapsami_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oturum" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonKullanim" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Oturum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gorev" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "kaynakTipi" TEXT,
    "kaynakId" TEXT,
    "sorumluId" TEXT,
    "tesisId" TEXT,
    "sonTarih" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "otomatikUretildi" BOOLEAN NOT NULL DEFAULT false,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kapanis" TIMESTAMP(3),

    CONSTRAINT "Gorev_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bildirim" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "govde" TEXT,
    "tip" TEXT NOT NULL DEFAULT 'bilgi',
    "kaynakTipi" TEXT,
    "kaynakId" TEXT,
    "okundu" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bildirim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnayTalebi" (
    "id" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "kaynakTipi" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "ozet" TEXT NOT NULL,
    "talepEdenId" TEXT,
    "onaylayanId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'bekliyor',
    "gerekce" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kapanis" TIMESTAMP(3),

    CONSTRAINT "OnayTalebi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsKosusu" (
    "id" TEXT NOT NULL,
    "isAdi" TEXT NOT NULL,
    "baslangic" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'calisiyor',
    "sureMs" INTEGER,
    "islenen" INTEGER NOT NULL DEFAULT 0,
    "uretilen" INTEGER NOT NULL DEFAULT 0,
    "hata" TEXT,
    "denemeNo" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "IsKosusu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntegrasyonKosusu" (
    "id" TEXT NOT NULL,
    "kaynak" TEXT NOT NULL,
    "baslangic" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'calisiyor',
    "kayitSayisi" INTEGER NOT NULL DEFAULT 0,
    "guvenEtiketi" TEXT NOT NULL DEFAULT 'manuel',
    "hata" TEXT,
    "ayrinti" TEXT,
    "connectorId" TEXT,
    "tetikleyen" TEXT NOT NULL DEFAULT 'manuel',
    "alinan" INTEGER NOT NULL DEFAULT 0,
    "kabulEdilen" INTEGER NOT NULL DEFAULT 0,
    "reddedilen" INTEGER NOT NULL DEFAULT 0,
    "yinelenen" INTEGER NOT NULL DEFAULT 0,
    "sureMs" INTEGER,
    "denemeNo" INTEGER NOT NULL DEFAULT 1,
    "imlecOnce" TEXT,
    "imlecSonra" TEXT,
    "kuruKosu" BOOLEAN NOT NULL DEFAULT false,
    "kuruOzetJson" TEXT,
    "hataOzeti" TEXT,
    "hataSinifi" TEXT,
    "korelasyonId" TEXT,
    "eslemeProfilSurumu" INTEGER,

    CONSTRAINT "EntegrasyonKosusu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VeriKalitesiBulgusu" (
    "id" TEXT NOT NULL,
    "kural" TEXT NOT NULL,
    "kaynakTipi" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kapanis" TIMESTAMP(3),

    CONSTRAINT "VeriKalitesiBulgusu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connector" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "kaynakSistem" TEXT NOT NULL,
    "kimlikTipi" TEXT NOT NULL DEFAULT 'none',
    "yapilandirmaJson" TEXT,
    "sirReferansi" TEXT,
    "pollAralikDk" INTEGER,
    "ortam" TEXT NOT NULL DEFAULT 'gelistirme',
    "senkronKipi" TEXT NOT NULL DEFAULT 'delta',
    "maksDeneme" INTEGER,
    "geriCekilmeMs" INTEGER,
    "ardisikHataSiniri" INTEGER,
    "ardisikHata" INTEGER NOT NULL DEFAULT 0,
    "kapsamTesisleriJson" TEXT,
    "eslemeProfilId" TEXT,
    "sonBasariliKosu" TIMESTAMP(3),
    "sonHata" TEXT,
    "sonHataOzeti" TEXT,
    "etkin" BOOLEAN NOT NULL DEFAULT false,
    "imlec" TEXT,
    "silindi" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EslemeProfili" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "connectorTipi" TEXT NOT NULL,
    "surum" INTEGER NOT NULL DEFAULT 1,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "kurallarJson" TEXT NOT NULL,
    "aciklama" TEXT,
    "olusturanId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EslemeProfili_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReddedilenKayit" (
    "id" TEXT NOT NULL,
    "kosuId" TEXT,
    "connectorId" TEXT,
    "kaynakSistem" TEXT NOT NULL,
    "kaynakKayitId" TEXT,
    "asama" TEXT NOT NULL,
    "sebep" TEXT NOT NULL,
    "hamJson" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "inceleyenId" TEXT,
    "incelemeNotu" TEXT,
    "incelemeZamani" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReddedilenKayit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VeriKokeni" (
    "id" TEXT NOT NULL,
    "varlikTipi" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "kokenTipi" TEXT NOT NULL,
    "kaynakSistem" TEXT NOT NULL,
    "kaynakKayitId" TEXT NOT NULL,
    "connectorId" TEXT,
    "kosuId" TEXT,
    "toplanma" TIMESTAMP(3),
    "aktarim" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guven" DOUBLE PRECISION,
    "dogrulamaDurumu" TEXT NOT NULL DEFAULT 'dogrulanmadi',
    "dogrulayanId" TEXT,
    "dogrulamaZamani" TIMESTAMP(3),
    "eslemeProfilSurumu" INTEGER,
    "kayitOzeti" TEXT,

    CONSTRAINT "VeriKokeni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KesifKaydi" (
    "id" TEXT NOT NULL,
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
    "guvenSkoru" DOUBLE PRECISION,
    "yetkiDurumu" TEXT NOT NULL DEFAULT 'karar_verilmedi',
    "yetkiGerekcesi" TEXT,
    "yetkiKararVerenId" TEXT,
    "yetkiKararZamani" TIMESTAMP(3),
    "ouiOnEki" TEXT,
    "otProtokolu" TEXT,
    "inceleyenId" TEXT,
    "incelemeZamani" TIMESTAMP(3),
    "incelemeNotu" TEXT,
    "ilkGorulme" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonGorulme" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KesifKaydi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopolojiAnlik" (
    "id" TEXT NOT NULL,
    "tesisId" TEXT,
    "kaynak" TEXT NOT NULL,
    "alindi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ozetHash" TEXT NOT NULL,
    "temelMi" BOOLEAN NOT NULL DEFAULT false,
    "onaylayanId" TEXT,
    "onayZamani" TIMESTAMP(3),
    "not" TEXT,

    CONSTRAINT "TopolojiAnlik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopolojiGozlemi" (
    "id" TEXT NOT NULL,
    "anlikId" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "ozellikJson" TEXT NOT NULL,

    CONSTRAINT "TopolojiGozlemi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopolojiSapmasi" (
    "id" TEXT NOT NULL,
    "tesisId" TEXT,
    "anlikId" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "siddet" TEXT NOT NULL DEFAULT 'orta',
    "aciklama" TEXT NOT NULL,
    "oncekiJson" TEXT,
    "sonrakiJson" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'gozlendi',
    "kararVerenId" TEXT,
    "kararZamani" TIMESTAMP(3),
    "kararGerekcesi" TEXT,
    "uretilenRiskId" TEXT,
    "uretilenBulguId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopolojiSapmasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KonfigurasyonYedegi" (
    "id" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "kaynakSistem" TEXT NOT NULL,
    "kaynakKayitId" TEXT NOT NULL,
    "yedekZamani" TIMESTAMP(3) NOT NULL,
    "surum" TEXT,
    "icerikHash" TEXT,
    "basarili" BOOLEAN NOT NULL DEFAULT true,
    "dogrulandi" BOOLEAN NOT NULL DEFAULT false,
    "dogrulamaZamani" TIMESTAMP(3),
    "restoreTestId" TEXT,
    "depolamaKonumu" TEXT,
    "saklamaGun" INTEGER,
    "sonBilinenIyi" BOOLEAN NOT NULL DEFAULT false,
    "hata" TEXT,

    CONSTRAINT "KonfigurasyonYedegi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TedarikciErisimOturumu" (
    "id" TEXT NOT NULL,
    "tedarikciId" TEXT NOT NULL,
    "hesapId" TEXT,
    "tesisId" TEXT,
    "varlikId" TEXT,
    "sistemId" TEXT,
    "baslangic" TIMESTAMP(3) NOT NULL,
    "bitis" TIMESTAMP(3),
    "kaynakSistem" TEXT NOT NULL,
    "kaynakKayitId" TEXT NOT NULL,
    "onayli" BOOLEAN,
    "mfaVar" BOOLEAN,
    "izlendi" BOOLEAN,
    "talepReferansi" TEXT,
    "kayitReferansi" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'tamamlandi',

    CONSTRAINT "TedarikciErisimOturumu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OlayVarlik" (
    "id" TEXT NOT NULL,
    "olayId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'etkilenen',

    CONSTRAINT "OlayVarlik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OlaySistem" (
    "id" TEXT NOT NULL,
    "olayId" TEXT NOT NULL,
    "sistemId" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'etkilenen',

    CONSTRAINT "OlaySistem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OlayRisk" (
    "id" TEXT NOT NULL,
    "olayId" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,

    CONSTRAINT "OlayRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OlayBulgu" (
    "id" TEXT NOT NULL,
    "olayId" TEXT NOT NULL,
    "bulguId" TEXT NOT NULL,

    CONSTRAINT "OlayBulgu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OlayProje" (
    "id" TEXT NOT NULL,
    "olayId" TEXT NOT NULL,
    "projeId" TEXT NOT NULL,

    CONSTRAINT "OlayProje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OlayDegisiklik" (
    "id" TEXT NOT NULL,
    "olayId" TEXT NOT NULL,
    "degisiklikId" TEXT NOT NULL,

    CONSTRAINT "OlayDegisiklik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiAnahtari" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "onEk" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sonKullanim" TIMESTAMP(3),
    "bitis" TIMESTAMP(3),
    "iptalZamani" TIMESTAMP(3),
    "kapsamJson" TEXT,
    "saltOkunur" BOOLEAN NOT NULL DEFAULT true,
    "olusturanId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiAnahtari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiIstegi" (
    "id" TEXT NOT NULL,
    "anahtarId" TEXT,
    "yontem" TEXT NOT NULL,
    "yol" TEXT NOT NULL,
    "idempotencyAnahtari" TEXT,
    "durumKodu" INTEGER NOT NULL,
    "yanitOzeti" TEXT,
    "hataKodu" TEXT,
    "sureMs" INTEGER,
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiIstegi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarlikAktarimi" (
    "id" TEXT NOT NULL,
    "dosyaAdi" TEXT NOT NULL,
    "kaynakTipi" TEXT NOT NULL,
    "yukleyenId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'eslesme',
    "eslemeJson" TEXT,
    "basliklarJson" TEXT,
    "okunan" INTEGER NOT NULL DEFAULT 0,
    "gecerli" INTEGER NOT NULL DEFAULT 0,
    "hatali" INTEGER NOT NULL DEFAULT 0,
    "yinelenen" INTEGER NOT NULL DEFAULT 0,
    "eklenen" INTEGER NOT NULL DEFAULT 0,
    "guncellenen" INTEGER NOT NULL DEFAULT 0,
    "raporJson" TEXT,
    "onaylayanId" TEXT,
    "onayZamani" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VarlikAktarimi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsKilidi" (
    "ad" TEXT NOT NULL,
    "sahip" TEXT NOT NULL,
    "alindi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gecerlilik" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsKilidi_pkey" PRIMARY KEY ("ad")
);

-- CreateTable
CREATE TABLE "Yapilandirma" (
    "anahtar" TEXT NOT NULL,
    "degerJson" TEXT NOT NULL,
    "guncellendi" TIMESTAMP(3) NOT NULL,
    "guncelleyenId" TEXT,

    CONSTRAINT "Yapilandirma_pkey" PRIMARY KEY ("anahtar")
);

-- CreateTable
CREATE TABLE "DegisiklikTalebi" (
    "id" TEXT NOT NULL,
    "hedefTipi" TEXT NOT NULL,
    "hedefId" TEXT,
    "hedefEtiket" TEXT NOT NULL,
    "onceJson" TEXT,
    "sonraJson" TEXT NOT NULL,
    "etkiJson" TEXT,
    "gerekce" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "talepEdenId" TEXT NOT NULL,
    "inceleyenId" TEXT,
    "onaylayanId" TEXT,
    "uygulayanId" TEXT,
    "redNedeni" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incelendi" TIMESTAMP(3),
    "onaylandi" TIMESTAMP(3),
    "uygulandi" TIMESTAMP(3),

    CONSTRAINT "DegisiklikTalebi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgSegmenti" (
    "id" TEXT NOT NULL,
    "bolgeId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "vlanId" INTEGER,
    "cidr" TEXT NOT NULL,
    "gatewayIp" TEXT,
    "yonetimAgi" BOOLEAN,
    "aciklama" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgSegmenti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlanUygulanabilirligi" (
    "id" TEXT NOT NULL,
    "varlikTipi" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "alan" TEXT NOT NULL,
    "gerekce" TEXT NOT NULL,
    "kaydedenId" TEXT NOT NULL,
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlanUygulanabilirligi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YamaKaydi" (
    "id" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "kaynakSistem" TEXT NOT NULL,
    "kaynakKayitId" TEXT NOT NULL,
    "mevcutSeviye" TEXT,
    "temelSeviye" TEXT,
    "yamaTarihi" TIMESTAMP(3),
    "eksikYama" TEXT,
    "siddet" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "yenidenBaslatmaGerekli" BOOLEAN,
    "bakimPenceresi" TEXT,
    "istisnaGerekcesi" TEXT,
    "telafiEdiciKontrol" TEXT,
    "yamalanamaz" BOOLEAN NOT NULL DEFAULT false,
    "durum" TEXT NOT NULL DEFAULT 'karar_verilemedi',
    "sonDogrulama" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YamaKaydi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmwareTemeli" (
    "id" TEXT NOT NULL,
    "turId" TEXT,
    "uretici" TEXT,
    "model" TEXT,
    "onayliSurum" TEXT NOT NULL,
    "asgariSurum" TEXT,
    "hedefSurum" TEXT,
    "bilinenKotuSurumler" TEXT,
    "advisoryReferansi" TEXT,
    "gecerlilikBaslangic" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aciklama" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirmwareTemeli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmwareUyumu" (
    "id" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "temelId" TEXT,
    "kuruluSurum" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'karar_verilemedi',
    "gerekce" TEXT,
    "istisnaGerekcesi" TEXT,
    "yukseltmePlani" TEXT,
    "sonDogrulama" TIMESTAMP(3),
    "kaynakSistem" TEXT,
    "hesaplanma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirmwareUyumu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advisory" (
    "id" TEXT NOT NULL,
    "kaynak" TEXT NOT NULL,
    "referans" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "yayim" TIMESTAMP(3),
    "guncelleme" TIMESTAMP(3),
    "url" TEXT,
    "ozet" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Advisory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisoryUrunu" (
    "id" TEXT NOT NULL,
    "advisoryId" TEXT NOT NULL,
    "uretici" TEXT,
    "urunAdi" TEXT,
    "cpe" TEXT,
    "etkilenenAlt" TEXT,
    "etkilenenAltDahil" BOOLEAN NOT NULL DEFAULT true,
    "etkilenenUst" TEXT,
    "etkilenenUstDahil" BOOLEAN NOT NULL DEFAULT false,
    "duzeltilenSurum" TEXT,

    CONSTRAINT "AdvisoryUrunu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisoryZafiyeti" (
    "id" TEXT NOT NULL,
    "advisoryId" TEXT NOT NULL,
    "zafiyetId" TEXT NOT NULL,

    CONSTRAINT "AdvisoryZafiyeti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZafiyetKorelasyonu" (
    "id" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "zafiyetId" TEXT NOT NULL,
    "advisoryUrunId" TEXT,
    "yontem" TEXT NOT NULL,
    "sonuc" TEXT NOT NULL,
    "guven" DOUBLE PRECISION,
    "gerekce" TEXT NOT NULL,
    "kanitJson" TEXT,
    "elleSonuc" TEXT,
    "elleGerekce" TEXT,
    "elleKararVerenId" TEXT,
    "elleKararZamani" TIMESTAMP(3),
    "hesaplanma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZafiyetKorelasyonu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SbomBelgesi" (
    "id" TEXT NOT NULL,
    "varlikId" TEXT,
    "yazilimId" TEXT,
    "bicim" TEXT NOT NULL,
    "bicimSurumu" TEXT,
    "seriNo" TEXT,
    "belgeSurumu" INTEGER NOT NULL DEFAULT 1,
    "uretimZamani" TIMESTAMP(3),
    "kaynakSistem" TEXT NOT NULL,
    "kaynakKayitId" TEXT NOT NULL,
    "bilesenSayisi" INTEGER NOT NULL DEFAULT 0,
    "hamOzeti" TEXT,
    "yukleyenId" TEXT,
    "yuklendi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SbomBelgesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YazilimBileseni" (
    "id" TEXT NOT NULL,
    "kimlik" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "surum" TEXT,
    "purl" TEXT,
    "cpe" TEXT,
    "tedarikci" TEXT,
    "lisans" TEXT,
    "ozet" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YazilimBileseni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SbomGirdisi" (
    "id" TEXT NOT NULL,
    "sbomId" TEXT NOT NULL,
    "bilesenId" TEXT NOT NULL,
    "kapsam" TEXT NOT NULL DEFAULT 'bilinmiyor',

    CONSTRAINT "SbomGirdisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuvenlikKapsami" (
    "id" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "kaynakSistem" TEXT,
    "kaynakKayitId" TEXT,
    "sonDogrulama" TIMESTAMP(3),
    "gerekce" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuvenlikKapsami_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProsesAdimi" (
    "id" TEXT NOT NULL,
    "surecId" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "sira" INTEGER NOT NULL,
    "aciklama" TEXT,
    "rtoSaat" DOUBLE PRECISION,
    "rpoSaat" DOUBLE PRECISION,
    "uretimEtkisi" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProsesAdimi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdimVarligi" (
    "id" TEXT NOT NULL,
    "adimId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'diger',
    "tekNokta" BOOLEAN,
    "yedekli" BOOLEAN,
    "aciklama" TEXT,

    CONSTRAINT "AdimVarligi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtkiDegerlendirmesi" (
    "id" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "uretimKaybi" DOUBLE PRECISION,
    "kayipBirim" TEXT,
    "kayipTipi" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "rtoSaat" DOUBLE PRECISION,
    "rpoSaat" DOUBLE PRECISION,
    "emniyetEtkisi" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "cevreEtkisi" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "gerekce" TEXT,
    "degerlendirenId" TEXT,
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtkiDegerlendirmesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ekip" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'diger',
    "tesisId" TEXT,
    "eposta" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ekip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EkipUyeligi" (
    "id" TEXT NOT NULL,
    "ekipId" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'uye',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EkipUyeligi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KonfigTemeli" (
    "id" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "yedekId" TEXT,
    "ozetHash" TEXT NOT NULL,
    "onaylayanId" TEXT,
    "onayZamani" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "not" TEXT,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KonfigTemeli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KonfigSapmasi" (
    "id" TEXT NOT NULL,
    "temelId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "yedekId" TEXT,
    "gozlenenHash" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "degisiklikRef" TEXT,
    "siddet" TEXT NOT NULL DEFAULT 'bilinmiyor',
    "aciklama" TEXT,
    "kararVerenId" TEXT,
    "kararZamani" TIMESTAMP(3),
    "kararGerekcesi" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KonfigSapmasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OuiKaydi" (
    "onEk" TEXT NOT NULL,
    "uretici" TEXT NOT NULL,
    "kaynak" TEXT,
    "yuklendi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OuiKaydi_pkey" PRIMARY KEY ("onEk")
);

-- CreateTable
CREATE TABLE "EnvanterSayimi" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tesisId" TEXT NOT NULL,
    "turId" TEXT,
    "bolgeId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'hazirlik',
    "baslangic" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" TIMESTAMP(3),
    "acanId" TEXT NOT NULL,
    "kapatanId" TEXT,
    "kapsamSayisi" INTEGER NOT NULL,
    "gerekce" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvanterSayimi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SayimSatiri" (
    "id" TEXT NOT NULL,
    "sayimId" TEXT NOT NULL,
    "varlikId" TEXT,
    "sahaKimligi" TEXT,
    "sonuc" TEXT NOT NULL DEFAULT 'sayilmadi',
    "bulunanYer" TEXT,
    "not" TEXT,
    "sayanId" TEXT,
    "sayimZamani" TIMESTAMP(3),

    CONSTRAINT "SayimSatiri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YedekParca" (
    "id" TEXT NOT NULL,
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
    "sonSayim" TIMESTAMP(3),
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YedekParca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YedekParcaVarlik" (
    "id" TEXT NOT NULL,
    "parcaId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,

    CONSTRAINT "YedekParcaVarlik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TasinabilirMedya" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'usb_bellek',
    "seriNo" TEXT,
    "tesisId" TEXT,
    "sahibiId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'kayitli',
    "sifreli" BOOLEAN,
    "sonTarama" TIMESTAMP(3),
    "not" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TasinabilirMedya_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedyaKullanimi" (
    "id" TEXT NOT NULL,
    "medyaId" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "baslangic" TIMESTAMP(3) NOT NULL,
    "bitis" TIMESTAMP(3),
    "amac" TEXT NOT NULL,
    "onaylayanId" TEXT,
    "onayZamani" TIMESTAMP(3),
    "kaynakSistem" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedyaKullanimi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BildirimYukumlulugu" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "regulasyonId" TEXT,
    "asgariSiddet" TEXT NOT NULL DEFAULT 'yuksek',
    "sureSaat" INTEGER,
    "dayanak" TEXT NOT NULL,
    "merci" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleyenId" TEXT,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "alanSablonuJson" TEXT,
    "kanalNotu" TEXT,
    "tetikleyici" TEXT NOT NULL DEFAULT 'olay',
    "donem" TEXT,
    "donemBaslangici" TEXT,
    "teslimGun" INTEGER,
    "kapsamKosulu" TEXT,

    CONSTRAINT "BildirimYukumlulugu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BildirimDonemi" (
    "id" TEXT NOT NULL,
    "yukumlulukId" TEXT NOT NULL,
    "donemEtiketi" TEXT NOT NULL,
    "baslangic" TIMESTAMP(3) NOT NULL,
    "bitis" TIMESTAMP(3) NOT NULL,
    "sonTarih" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "referansNo" TEXT,
    "verenId" TEXT,
    "verilmeZamani" TIMESTAMP(3),
    "teyitZamani" TIMESTAMP(3),
    "kanitId" TEXT,
    "uygulanmazGerekcesi" TEXT,
    "acildi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BildirimDonemi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BildirimKaydi" (
    "id" TEXT NOT NULL,
    "olayId" TEXT NOT NULL,
    "yukumlulukId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "sonTarih" TIMESTAMP(3),
    "taslakMetin" TEXT,
    "gonderenId" TEXT,
    "gonderimZamani" TIMESTAMP(3),
    "referansNo" TEXT,
    "kanitId" TEXT,
    "teyitZamani" TIMESTAMP(3),
    "uygulanmazGerekcesi" TEXT,
    "acildi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BildirimKaydi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KontrolTesti" (
    "id" TEXT NOT NULL,
    "maddeDurumuId" TEXT NOT NULL,
    "yontem" TEXT NOT NULL,
    "evrenSayisi" INTEGER,
    "orneklemSayisi" INTEGER,
    "uygunSayisi" INTEGER,
    "sonuc" TEXT NOT NULL,
    "testTarihi" TIMESTAMP(3) NOT NULL,
    "testEdenId" TEXT NOT NULL,
    "not" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KontrolTesti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YonetimGozdenGecirme" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'planli',
    "regulasyonId" TEXT,
    "katilimcilar" TEXT,
    "gundem" TEXT,
    "ozet" TEXT,
    "yurutenId" TEXT NOT NULL,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YonetimGozdenGecirme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GozdenGecirmeKarari" (
    "id" TEXT NOT NULL,
    "gozdenGecirmeId" TEXT NOT NULL,
    "karar" TEXT NOT NULL,
    "sorumluId" TEXT,
    "sonTarih" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "gorevId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GozdenGecirmeKarari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Egitim" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "gecerlilikAy" INTEGER,
    "zorunlu" BOOLEAN NOT NULL DEFAULT false,
    "aciklama" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Egitim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EgitimKaydi" (
    "id" TEXT NOT NULL,
    "egitimId" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "tamamlanma" TIMESTAMP(3) NOT NULL,
    "gecerlilikBitis" TIMESTAMP(3),
    "belgeNo" TEXT,
    "kanitId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EgitimKaydi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EgitimMadde" (
    "id" TEXT NOT NULL,
    "egitimId" TEXT NOT NULL,
    "maddeId" TEXT NOT NULL,

    CONSTRAINT "EgitimMadde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarlikAtamaTalebi" (
    "id" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "atananId" TEXT NOT NULL,
    "atayanId" TEXT NOT NULL,
    "oncekiSahipId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'bekliyor',
    "not" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonTarih" TIMESTAMP(3) NOT NULL,
    "cevapZamani" TIMESTAMP(3),
    "cevapNotu" TEXT,
    "iptalZamani" TIMESTAMP(3),
    "iptalEdenId" TEXT,
    "uyarildi" BOOLEAN NOT NULL DEFAULT false,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VarlikAtamaTalebi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarlikDurusGozlemi" (
    "id" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "kaynakSistem" TEXT NOT NULL,
    "kaynakKayitId" TEXT NOT NULL,
    "connectorId" TEXT,
    "kosuId" TEXT,
    "hostname" TEXT,
    "ipAdresi" TEXT,
    "macAdresi" TEXT,
    "uretici" TEXT,
    "model" TEXT,
    "isletimSistemi" TEXT,
    "osSurumu" TEXT,
    "osYapisi" TEXT,
    "yamaSeviyesi" TEXT,
    "sonYamaTarihi" TIMESTAMP(3),
    "firmware" TEXT,
    "kaynakZamani" TIMESTAMP(3),
    "alinma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guven" DOUBLE PRECISION,
    "ham" TEXT,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VarlikDurusGozlemi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IcerikPaketi" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "ulke" TEXT,
    "sektorKod" TEXT,
    "dil" TEXT NOT NULL DEFAULT 'tr',
    "yayinci" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'kurulu',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IcerikPaketi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IcerikPaketiSurumu" (
    "id" TEXT NOT NULL,
    "paketId" TEXT NOT NULL,
    "surum" TEXT NOT NULL,
    "lisansJson" TEXT NOT NULL,
    "ozetJson" TEXT NOT NULL,
    "manifestJson" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'kurulu',
    "kurulumZamani" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kuranId" TEXT,
    "raporJson" TEXT,

    CONSTRAINT "IcerikPaketiSurumu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSablonu" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tur" TEXT NOT NULL DEFAULT 'denetim',
    "sektorId" TEXT,
    "dosyaAdi" TEXT,
    "tanimJson" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSablonu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaporSablonu" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "sektorId" TEXT,
    "tanimJson" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaporSablonu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolKatalogu" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT,
    "izinlerJson" TEXT NOT NULL,
    "kapsamEkseni" TEXT NOT NULL DEFAULT 'global',
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolKatalogu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KimlikSaglayici" (
    "id" TEXT NOT NULL,
    "kiraci" TEXT NOT NULL DEFAULT 'varsayilan',
    "ad" TEXT NOT NULL,
    "tur" TEXT NOT NULL DEFAULT 'oidc',
    "issuer" TEXT,
    "clientId" TEXT,
    "istemciSirriReferansi" TEXT,
    "yetkilendirmeUcu" TEXT,
    "jetonUcu" TEXT,
    "jwksUcu" TEXT,
    "yonlendirmeUri" TEXT,
    "rolIddiasi" TEXT,
    "rolEslemesiJson" TEXT,
    "jitAcik" BOOLEAN NOT NULL DEFAULT false,
    "bagli" BOOLEAN NOT NULL DEFAULT false,
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KimlikSaglayici_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KimlikBagi" (
    "id" TEXT NOT NULL,
    "saglayiciId" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "konu" TEXT NOT NULL,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonGiris" TIMESTAMP(3),

    CONSTRAINT "KimlikBagi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaKaydi" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "tur" TEXT NOT NULL DEFAULT 'totp',
    "sirZarfi" TEXT NOT NULL,
    "dogrulandi" BOOLEAN NOT NULL DEFAULT false,
    "sonAdim" INTEGER,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonKullanim" TIMESTAMP(3),

    CONSTRAINT "MfaKaydi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaKurtarmaKodu" (
    "id" TEXT NOT NULL,
    "kayitId" TEXT NOT NULL,
    "kodHash" TEXT NOT NULL,
    "kullanildi" TIMESTAMP(3),

    CONSTRAINT "MfaKurtarmaKodu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OturumPolitikasi" (
    "id" TEXT NOT NULL,
    "kiraci" TEXT NOT NULL DEFAULT 'varsayilan',
    "mutlakSaat" INTEGER NOT NULL DEFAULT 12,
    "atilDakika" INTEGER NOT NULL DEFAULT 120,
    "mfaZorunlu" BOOLEAN NOT NULL DEFAULT false,
    "guncellendi" TIMESTAMP(3) NOT NULL,
    "guncelleyenId" TEXT,

    CONSTRAINT "OturumPolitikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MevzuatKaynagi" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "yayinKanali" TEXT NOT NULL,
    "tur" TEXT NOT NULL DEFAULT 'liste',
    "dil" TEXT NOT NULL DEFAULT 'tr',
    "paketKodu" TEXT,
    "merci" TEXT,
    "etkin" BOOLEAN NOT NULL DEFAULT false,
    "durum" TEXT NOT NULL DEFAULT 'hazir',
    "durumNotu" TEXT,
    "sonTarama" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MevzuatKaynagi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MevzuatTaramasi" (
    "id" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "farkVar" BOOLEAN,
    "sebep" TEXT,
    "httpKodu" INTEGER,
    "adaySayisi" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MevzuatTaramasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MevzuatDegisiklikAdayi" (
    "id" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "yayinTarihi" TIMESTAMP(3),
    "ozet" TEXT,
    "bulundu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durum" TEXT NOT NULL DEFAULT 'yeni',
    "kararVerenId" TEXT,
    "kararZamani" TIMESTAMP(3),
    "gerekce" TEXT,
    "surumId" TEXT,

    CONSTRAINT "MevzuatDegisiklikAdayi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VeriKorumaSuresi" (
    "id" TEXT NOT NULL,
    "konu" TEXT NOT NULL,
    "gun" INTEGER,
    "isGunu" BOOLEAN NOT NULL DEFAULT false,
    "haftaSonuJson" TEXT,
    "dayanak" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "koken" TEXT NOT NULL DEFAULT 'kiraci',
    "paketSurumId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VeriKorumaSuresi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VeriIslemeFaaliyeti" (
    "id" TEXT NOT NULL,
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
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VeriIslemeFaaliyeti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YurtDisiAktarim" (
    "id" TEXT NOT NULL,
    "faaliyetId" TEXT NOT NULL,
    "aliciUlke" TEXT NOT NULL,
    "aliciAd" TEXT,
    "dayanak" TEXT NOT NULL,
    "bildirimTarihi" TIMESTAMP(3),
    "bildirimSonTarih" TIMESTAMP(3),
    "not" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YurtDisiAktarim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VeriSahibiBasvurusu" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "alinma" TIMESTAMP(3) NOT NULL,
    "kanal" TEXT,
    "konu" TEXT NOT NULL,
    "ozet" TEXT,
    "sonTarih" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'yeni',
    "yanitMetni" TEXT,
    "yanitlayanId" TEXT,
    "yanitZamani" TIMESTAMP(3),
    "redGerekcesi" TEXT,
    "gorevId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VeriSahibiBasvurusu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SicilKaydi" (
    "id" TEXT NOT NULL,
    "sicilAd" TEXT NOT NULL,
    "sicilNo" TEXT,
    "kayitTarihi" TIMESTAMP(3),
    "sonGuncelleme" TIMESTAMP(3),
    "yukumluMu" BOOLEAN,
    "muafiyetGerekcesi" TEXT,
    "sorumluId" TEXT,
    "dayanak" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SicilKaydi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OlayVeriFaaliyeti" (
    "id" TEXT NOT NULL,
    "olayId" TEXT NOT NULL,
    "faaliyetId" TEXT NOT NULL,
    "etkilenenKayit" INTEGER,
    "not" TEXT,

    CONSTRAINT "OlayVeriFaaliyeti_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sektor_kod_key" ON "Sektor"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "KapsamOgesiTuru_kod_key" ON "KapsamOgesiTuru"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "KapsamOgesi_kod_key" ON "KapsamOgesi"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "KapsamOgesi_tesisId_key" ON "KapsamOgesi"("tesisId");

-- CreateIndex
CREATE INDEX "KapsamOgesi_turId_idx" ON "KapsamOgesi"("turId");

-- CreateIndex
CREATE UNIQUE INDEX "TesisTipi_kod_key" ON "TesisTipi"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "SektorOznitelikSemasi_sektorId_anahtar_key" ON "SektorOznitelikSemasi"("sektorId", "anahtar");

-- CreateIndex
CREATE UNIQUE INDEX "SektorSozlugu_sektorId_anahtar_dil_key" ON "SektorSozlugu"("sektorId", "anahtar", "dil");

-- CreateIndex
CREATE INDEX "TesisOzellik_anahtar_idx" ON "TesisOzellik"("anahtar");

-- CreateIndex
CREATE UNIQUE INDEX "TesisOzellik_tesisId_anahtar_key" ON "TesisOzellik"("tesisId", "anahtar");

-- CreateIndex
CREATE INDEX "BirimOzellik_anahtar_idx" ON "BirimOzellik"("anahtar");

-- CreateIndex
CREATE UNIQUE INDEX "BirimOzellik_birimId_anahtar_key" ON "BirimOzellik"("birimId", "anahtar");

-- CreateIndex
CREATE UNIQUE INDEX "Tesis_kod_key" ON "Tesis"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "Regulasyon_kod_key" ON "Regulasyon"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "KapsamAlani_kod_key" ON "KapsamAlani"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "Madde_regulasyonId_surumId_kod_key" ON "Madde"("regulasyonId", "surumId", "kod");

-- CreateIndex
CREATE UNIQUE INDEX "MaddeAlan_maddeId_alanId_key" ON "MaddeAlan"("maddeId", "alanId");

-- CreateIndex
CREATE UNIQUE INDEX "UyumSureci_kod_key" ON "UyumSureci"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "SurecKapsami_surecId_kapsamOgesiId_key" ON "SurecKapsami"("surecId", "kapsamOgesiId");

-- CreateIndex
CREATE INDEX "MaddeDurumu_surecId_kapsamOgesiId_durum_idx" ON "MaddeDurumu"("surecId", "kapsamOgesiId", "durum");

-- CreateIndex
CREATE UNIQUE INDEX "MaddeDurumu_surecId_maddeId_kapsamOgesiId_key" ON "MaddeDurumu"("surecId", "maddeId", "kapsamOgesiId");

-- CreateIndex
CREATE INDEX "Bulgu_durum_onemDerecesi_idx" ON "Bulgu"("durum", "onemDerecesi");

-- CreateIndex
CREATE INDEX "KanitSurumu_kanitId_idx" ON "KanitSurumu"("kanitId");

-- CreateIndex
CREATE UNIQUE INDEX "KanitSurumu_kanitId_surum_key" ON "KanitSurumu"("kanitId", "surum");

-- CreateIndex
CREATE UNIQUE INDEX "KanitBaglantisi_kanitId_maddeDurumuId_key" ON "KanitBaglantisi"("kanitId", "maddeDurumuId");

-- CreateIndex
CREATE UNIQUE INDEX "MaddeEslestirmesi_kaynakId_hedefId_key" ON "MaddeEslestirmesi"("kaynakId", "hedefId");

-- CreateIndex
CREATE UNIQUE INDEX "Proje_kod_key" ON "Proje"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "ProjeBaglantisi_projeId_maddeId_bulguId_riskId_tesisId_varl_key" ON "ProjeBaglantisi"("projeId", "maddeId", "bulguId", "riskId", "tesisId", "varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "Kullanici_eposta_key" ON "Kullanici"("eposta");

-- CreateIndex
CREATE UNIQUE INDEX "Yetki_kullaniciId_surecId_kapsamOgesiId_tuzelKisiId_regulas_key" ON "Yetki"("kullaniciId", "surecId", "kapsamOgesiId", "tuzelKisiId", "regulasyonId", "modul");

-- CreateIndex
CREATE INDEX "AktiviteKaydi_varlikTipi_varlikId_zaman_idx" ON "AktiviteKaydi"("varlikTipi", "varlikId", "zaman");

-- CreateIndex
CREATE INDEX "AktiviteKaydi_zaman_idx" ON "AktiviteKaydi"("zaman");

-- CreateIndex
CREATE UNIQUE INDEX "Grup_kod_key" ON "Grup"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "TuzelKisi_kod_key" ON "TuzelKisi"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "OperasyonelBirim_tesisId_kod_key" ON "OperasyonelBirim"("tesisId", "kod");

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
CREATE UNIQUE INDEX "EskalasyonKurali_kaynakTipi_onemDerecesi_kademe_key" ON "EskalasyonKurali"("kaynakTipi", "onemDerecesi", "kademe");

-- CreateIndex
CREATE INDEX "EskalasyonKaydi_zaman_idx" ON "EskalasyonKaydi"("zaman");

-- CreateIndex
CREATE UNIQUE INDEX "EskalasyonKaydi_kaynakTipi_kaynakId_kademe_key" ON "EskalasyonKaydi"("kaynakTipi", "kaynakId", "kademe");

-- CreateIndex
CREATE UNIQUE INDEX "RegulasyonKaynagi_regulasyonId_ad_key" ON "RegulasyonKaynagi"("regulasyonId", "ad");

-- CreateIndex
CREATE INDEX "DegerlendirmeAktarimi_regulasyonId_kapsamOgesiId_durum_idx" ON "DegerlendirmeAktarimi"("regulasyonId", "kapsamOgesiId", "durum");

-- CreateIndex
CREATE UNIQUE INDEX "SaklamaPolitikasi_varlikTipi_key" ON "SaklamaPolitikasi"("varlikTipi");

-- CreateIndex
CREATE INDEX "LegalHold_varlikTipi_durum_idx" ON "LegalHold"("varlikTipi", "durum");

-- CreateIndex
CREATE INDEX "ImhaKarari_durum_varlikTipi_idx" ON "ImhaKarari"("durum", "varlikTipi");

-- CreateIndex
CREATE INDEX "DenetciErisimi_durum_bitis_idx" ON "DenetciErisimi"("durum", "bitis");

-- CreateIndex
CREATE UNIQUE INDEX "DenetciKapsami_erisimId_kapsamOgesiId_key" ON "DenetciKapsami"("erisimId", "kapsamOgesiId");

-- CreateIndex
CREATE UNIQUE INDEX "UygulanabilirlikKarari_kapsamOgesiId_regulasyonId_key" ON "UygulanabilirlikKarari"("kapsamOgesiId", "regulasyonId");

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
CREATE UNIQUE INDEX "Dokuman_kod_key" ON "Dokuman"("kod");

-- CreateIndex
CREATE INDEX "Dokuman_durum_sonrakiGozdenGecirme_idx" ON "Dokuman"("durum", "sonrakiGozdenGecirme");

-- CreateIndex
CREATE INDEX "DokumanMadde_maddeId_idx" ON "DokumanMadde"("maddeId");

-- CreateIndex
CREATE UNIQUE INDEX "DokumanMadde_dokumanId_maddeId_key" ON "DokumanMadde"("dokumanId", "maddeId");

-- CreateIndex
CREATE UNIQUE INDEX "DokumanTesis_dokumanId_tesisId_key" ON "DokumanTesis"("dokumanId", "tesisId");

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
CREATE UNIQUE INDEX "ErisimAtamasi_hesapId_varlikId_kapsam_key" ON "ErisimAtamasi"("hesapId", "varlikId", "kapsam");

-- CreateIndex
CREATE UNIQUE INDEX "Tedarikci_ad_key" ON "Tedarikci"("ad");

-- CreateIndex
CREATE UNIQUE INDEX "Sozlesme_kod_key" ON "Sozlesme"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "YazilimUrunu_ad_surum_key" ON "YazilimUrunu"("ad", "surum");

-- CreateIndex
CREATE UNIQUE INDEX "VarlikYazilimi_varlikId_yazilimId_key" ON "VarlikYazilimi"("varlikId", "yazilimId");

-- CreateIndex
CREATE UNIQUE INDEX "Zafiyet_kaynakRef_key" ON "Zafiyet"("kaynakRef");

-- CreateIndex
CREATE INDEX "VarlikZafiyeti_varlikId_idx" ON "VarlikZafiyeti"("varlikId");

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
CREATE UNIQUE INDEX "KanitKapsami_kanitId_kapsamOgesiId_key" ON "KanitKapsami"("kanitId", "kapsamOgesiId");

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
CREATE INDEX "EntegrasyonKosusu_connectorId_baslangic_idx" ON "EntegrasyonKosusu"("connectorId", "baslangic");

-- CreateIndex
CREATE INDEX "VeriKalitesiBulgusu_kural_durum_idx" ON "VeriKalitesiBulgusu"("kural", "durum");

-- CreateIndex
CREATE UNIQUE INDEX "Connector_kod_key" ON "Connector"("kod");

-- CreateIndex
CREATE INDEX "Connector_tip_etkin_idx" ON "Connector"("tip", "etkin");

-- CreateIndex
CREATE INDEX "EslemeProfili_connectorTipi_durum_idx" ON "EslemeProfili"("connectorTipi", "durum");

-- CreateIndex
CREATE UNIQUE INDEX "EslemeProfili_kod_surum_key" ON "EslemeProfili"("kod", "surum");

-- CreateIndex
CREATE INDEX "ReddedilenKayit_durum_olusturuldu_idx" ON "ReddedilenKayit"("durum", "olusturuldu");

-- CreateIndex
CREATE INDEX "ReddedilenKayit_connectorId_asama_idx" ON "ReddedilenKayit"("connectorId", "asama");

-- CreateIndex
CREATE INDEX "VeriKokeni_varlikTipi_varlikId_idx" ON "VeriKokeni"("varlikTipi", "varlikId");

-- CreateIndex
CREATE INDEX "VeriKokeni_kokenTipi_dogrulamaDurumu_idx" ON "VeriKokeni"("kokenTipi", "dogrulamaDurumu");

-- CreateIndex
CREATE UNIQUE INDEX "VeriKokeni_varlikTipi_varlikId_kaynakSistem_kaynakKayitId_key" ON "VeriKokeni"("varlikTipi", "varlikId", "kaynakSistem", "kaynakKayitId");

-- CreateIndex
CREATE INDEX "KesifKaydi_yetkiDurumu_idx" ON "KesifKaydi"("yetkiDurumu");

-- CreateIndex
CREATE INDEX "KesifKaydi_durum_sonGorulme_idx" ON "KesifKaydi"("durum", "sonGorulme");

-- CreateIndex
CREATE INDEX "KesifKaydi_tesisId_durum_idx" ON "KesifKaydi"("tesisId", "durum");

-- CreateIndex
CREATE INDEX "KesifKaydi_sonGorulme_idx" ON "KesifKaydi"("sonGorulme");

-- CreateIndex
CREATE INDEX "KesifKaydi_eslesenVarlikId_sonGorulme_idx" ON "KesifKaydi"("eslesenVarlikId", "sonGorulme");

-- CreateIndex
CREATE UNIQUE INDEX "KesifKaydi_kaynak_kaynakKayitId_key" ON "KesifKaydi"("kaynak", "kaynakKayitId");

-- CreateIndex
CREATE INDEX "TopolojiAnlik_tesisId_alindi_idx" ON "TopolojiAnlik"("tesisId", "alindi");

-- CreateIndex
CREATE INDEX "TopolojiGozlemi_anlikId_tip_idx" ON "TopolojiGozlemi"("anlikId", "tip");

-- CreateIndex
CREATE INDEX "TopolojiSapmasi_durum_siddet_idx" ON "TopolojiSapmasi"("durum", "siddet");

-- CreateIndex
CREATE INDEX "KonfigurasyonYedegi_varlikId_yedekZamani_idx" ON "KonfigurasyonYedegi"("varlikId", "yedekZamani");

-- CreateIndex
CREATE UNIQUE INDEX "KonfigurasyonYedegi_kaynakSistem_kaynakKayitId_key" ON "KonfigurasyonYedegi"("kaynakSistem", "kaynakKayitId");

-- CreateIndex
CREATE INDEX "TedarikciErisimOturumu_tedarikciId_baslangic_idx" ON "TedarikciErisimOturumu"("tedarikciId", "baslangic");

-- CreateIndex
CREATE UNIQUE INDEX "TedarikciErisimOturumu_kaynakSistem_kaynakKayitId_key" ON "TedarikciErisimOturumu"("kaynakSistem", "kaynakKayitId");

-- CreateIndex
CREATE UNIQUE INDEX "OlayVarlik_olayId_varlikId_key" ON "OlayVarlik"("olayId", "varlikId");

-- CreateIndex
CREATE UNIQUE INDEX "OlaySistem_olayId_sistemId_key" ON "OlaySistem"("olayId", "sistemId");

-- CreateIndex
CREATE UNIQUE INDEX "OlayRisk_olayId_riskId_key" ON "OlayRisk"("olayId", "riskId");

-- CreateIndex
CREATE UNIQUE INDEX "OlayBulgu_olayId_bulguId_key" ON "OlayBulgu"("olayId", "bulguId");

-- CreateIndex
CREATE UNIQUE INDEX "OlayProje_olayId_projeId_key" ON "OlayProje"("olayId", "projeId");

-- CreateIndex
CREATE UNIQUE INDEX "OlayDegisiklik_olayId_degisiklikId_key" ON "OlayDegisiklik"("olayId", "degisiklikId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiAnahtari_tokenHash_key" ON "ApiAnahtari"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiAnahtari_kullaniciId_idx" ON "ApiAnahtari"("kullaniciId");

-- CreateIndex
CREATE INDEX "ApiIstegi_yol_zaman_idx" ON "ApiIstegi"("yol", "zaman");

-- CreateIndex
CREATE INDEX "ApiIstegi_anahtarId_zaman_idx" ON "ApiIstegi"("anahtarId", "zaman");

-- CreateIndex
CREATE UNIQUE INDEX "ApiIstegi_anahtarId_idempotencyAnahtari_key" ON "ApiIstegi"("anahtarId", "idempotencyAnahtari");

-- CreateIndex
CREATE INDEX "IsKilidi_gecerlilik_idx" ON "IsKilidi"("gecerlilik");

-- CreateIndex
CREATE INDEX "DegisiklikTalebi_durum_hedefTipi_idx" ON "DegisiklikTalebi"("durum", "hedefTipi");

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
CREATE UNIQUE INDEX "YazilimBileseni_kimlik_key" ON "YazilimBileseni"("kimlik");

-- CreateIndex
CREATE INDEX "YazilimBileseni_purl_idx" ON "YazilimBileseni"("purl");

-- CreateIndex
CREATE INDEX "YazilimBileseni_ad_idx" ON "YazilimBileseni"("ad");

-- CreateIndex
CREATE UNIQUE INDEX "SbomGirdisi_sbomId_bilesenId_key" ON "SbomGirdisi"("sbomId", "bilesenId");

-- CreateIndex
CREATE INDEX "GuvenlikKapsami_tip_durum_idx" ON "GuvenlikKapsami"("tip", "durum");

-- CreateIndex
CREATE UNIQUE INDEX "GuvenlikKapsami_varlikId_tip_key" ON "GuvenlikKapsami"("varlikId", "tip");

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
CREATE INDEX "BildirimDonemi_durum_idx" ON "BildirimDonemi"("durum");

-- CreateIndex
CREATE INDEX "BildirimDonemi_sonTarih_idx" ON "BildirimDonemi"("sonTarih");

-- CreateIndex
CREATE UNIQUE INDEX "BildirimDonemi_yukumlulukId_donemEtiketi_key" ON "BildirimDonemi"("yukumlulukId", "donemEtiketi");

-- CreateIndex
CREATE INDEX "BildirimKaydi_durum_idx" ON "BildirimKaydi"("durum");

-- CreateIndex
CREATE INDEX "BildirimKaydi_sonTarih_idx" ON "BildirimKaydi"("sonTarih");

-- CreateIndex
CREATE UNIQUE INDEX "BildirimKaydi_olayId_yukumlulukId_key" ON "BildirimKaydi"("olayId", "yukumlulukId");

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

-- CreateIndex
CREATE INDEX "VarlikAtamaTalebi_atananId_durum_idx" ON "VarlikAtamaTalebi"("atananId", "durum");

-- CreateIndex
CREATE INDEX "VarlikAtamaTalebi_varlikId_durum_idx" ON "VarlikAtamaTalebi"("varlikId", "durum");

-- CreateIndex
CREATE INDEX "VarlikAtamaTalebi_durum_sonTarih_idx" ON "VarlikAtamaTalebi"("durum", "sonTarih");

-- CreateIndex
CREATE INDEX "VarlikDurusGozlemi_kaynakSistem_kaynakZamani_idx" ON "VarlikDurusGozlemi"("kaynakSistem", "kaynakZamani");

-- CreateIndex
CREATE UNIQUE INDEX "VarlikDurusGozlemi_varlikId_kaynakSistem_key" ON "VarlikDurusGozlemi"("varlikId", "kaynakSistem");

-- CreateIndex
CREATE UNIQUE INDEX "IcerikPaketi_kod_key" ON "IcerikPaketi"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "IcerikPaketiSurumu_paketId_surum_key" ON "IcerikPaketiSurumu"("paketId", "surum");

-- CreateIndex
CREATE UNIQUE INDEX "FormSablonu_kod_key" ON "FormSablonu"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "RaporSablonu_kod_key" ON "RaporSablonu"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "RolKatalogu_kod_key" ON "RolKatalogu"("kod");

-- CreateIndex
CREATE INDEX "KimlikSaglayici_aktif_idx" ON "KimlikSaglayici"("aktif");

-- CreateIndex
CREATE UNIQUE INDEX "KimlikSaglayici_kiraci_ad_key" ON "KimlikSaglayici"("kiraci", "ad");

-- CreateIndex
CREATE INDEX "KimlikBagi_kullaniciId_idx" ON "KimlikBagi"("kullaniciId");

-- CreateIndex
CREATE UNIQUE INDEX "KimlikBagi_saglayiciId_konu_key" ON "KimlikBagi"("saglayiciId", "konu");

-- CreateIndex
CREATE UNIQUE INDEX "MfaKaydi_kullaniciId_key" ON "MfaKaydi"("kullaniciId");

-- CreateIndex
CREATE INDEX "MfaKurtarmaKodu_kayitId_idx" ON "MfaKurtarmaKodu"("kayitId");

-- CreateIndex
CREATE UNIQUE INDEX "OturumPolitikasi_kiraci_key" ON "OturumPolitikasi"("kiraci");

-- CreateIndex
CREATE UNIQUE INDEX "MevzuatKaynagi_kod_key" ON "MevzuatKaynagi"("kod");

-- CreateIndex
CREATE INDEX "MevzuatKaynagi_etkin_durum_idx" ON "MevzuatKaynagi"("etkin", "durum");

-- CreateIndex
CREATE INDEX "MevzuatTaramasi_kaynakId_zaman_idx" ON "MevzuatTaramasi"("kaynakId", "zaman");

-- CreateIndex
CREATE INDEX "MevzuatDegisiklikAdayi_durum_bulundu_idx" ON "MevzuatDegisiklikAdayi"("durum", "bulundu");

-- CreateIndex
CREATE UNIQUE INDEX "MevzuatDegisiklikAdayi_kaynakId_url_key" ON "MevzuatDegisiklikAdayi"("kaynakId", "url");

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

-- AddForeignKey
ALTER TABLE "KapsamOgesiTuru" ADD CONSTRAINT "KapsamOgesiTuru_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KapsamOgesi" ADD CONSTRAINT "KapsamOgesi_turId_fkey" FOREIGN KEY ("turId") REFERENCES "KapsamOgesiTuru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KapsamOgesi" ADD CONSTRAINT "KapsamOgesi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KapsamOgesi" ADD CONSTRAINT "KapsamOgesi_ustId_fkey" FOREIGN KEY ("ustId") REFERENCES "KapsamOgesi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TesisTipi" ADD CONSTRAINT "TesisTipi_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TesisTipi" ADD CONSTRAINT "TesisTipi_varsayilanKapsamTuruId_fkey" FOREIGN KEY ("varsayilanKapsamTuruId") REFERENCES "KapsamOgesiTuru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SektorOznitelikSemasi" ADD CONSTRAINT "SektorOznitelikSemasi_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SektorSozlugu" ADD CONSTRAINT "SektorSozlugu_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TesisOzellik" ADD CONSTRAINT "TesisOzellik_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BirimOzellik" ADD CONSTRAINT "BirimOzellik_birimId_fkey" FOREIGN KEY ("birimId") REFERENCES "OperasyonelBirim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tesis" ADD CONSTRAINT "Tesis_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "TesisTipi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tesis" ADD CONSTRAINT "Tesis_tuzelKisiId_fkey" FOREIGN KEY ("tuzelKisiId") REFERENCES "TuzelKisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tesis" ADD CONSTRAINT "Tesis_konumDogrulayanId_fkey" FOREIGN KEY ("konumDogrulayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Madde" ADD CONSTRAINT "Madde_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Madde" ADD CONSTRAINT "Madde_ustMaddeId_fkey" FOREIGN KEY ("ustMaddeId") REFERENCES "Madde"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Madde" ADD CONSTRAINT "Madde_surumId_fkey" FOREIGN KEY ("surumId") REFERENCES "FrameworkSurumu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Madde" ADD CONSTRAINT "Madde_yeriniAlanId_fkey" FOREIGN KEY ("yeriniAlanId") REFERENCES "Madde"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaddeAlan" ADD CONSTRAINT "MaddeAlan_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaddeAlan" ADD CONSTRAINT "MaddeAlan_alanId_fkey" FOREIGN KEY ("alanId") REFERENCES "KapsamAlani"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UyumSureci" ADD CONSTRAINT "UyumSureci_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurecKapsami" ADD CONSTRAINT "SurecKapsami_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurecKapsami" ADD CONSTRAINT "SurecKapsami_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaddeDurumu" ADD CONSTRAINT "MaddeDurumu_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaddeDurumu" ADD CONSTRAINT "MaddeDurumu_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaddeDurumu" ADD CONSTRAINT "MaddeDurumu_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaddeDurumu" ADD CONSTRAINT "MaddeDurumu_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaddeDurumu" ADD CONSTRAINT "MaddeDurumu_ekipId_fkey" FOREIGN KEY ("ekipId") REFERENCES "Ekip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaddeDurumu" ADD CONSTRAINT "MaddeDurumu_dogrulayanId_fkey" FOREIGN KEY ("dogrulayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulgu" ADD CONSTRAINT "Bulgu_maddeDurumuId_fkey" FOREIGN KEY ("maddeDurumuId") REFERENCES "MaddeDurumu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulgu" ADD CONSTRAINT "Bulgu_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulgu" ADD CONSTRAINT "Bulgu_denetimId_fkey" FOREIGN KEY ("denetimId") REFERENCES "Denetim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulgu" ADD CONSTRAINT "Bulgu_tekrarBulguId_fkey" FOREIGN KEY ("tekrarBulguId") REFERENCES "Bulgu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulgu" ADD CONSTRAINT "Bulgu_kapanisDogrulayanId_fkey" FOREIGN KEY ("kapanisDogrulayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulgu" ADD CONSTRAINT "Bulgu_kokNedenAnalizEdenId_fkey" FOREIGN KEY ("kokNedenAnalizEdenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aksiyon" ADD CONSTRAINT "Aksiyon_bulguId_fkey" FOREIGN KEY ("bulguId") REFERENCES "Bulgu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aksiyon" ADD CONSTRAINT "Aksiyon_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aksiyon" ADD CONSTRAINT "Aksiyon_dogrulayanId_fkey" FOREIGN KEY ("dogrulayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kanit" ADD CONSTRAINT "Kanit_dokumanId_fkey" FOREIGN KEY ("dokumanId") REFERENCES "Dokuman"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kanit" ADD CONSTRAINT "Kanit_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kanit" ADD CONSTRAINT "Kanit_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanitSurumu" ADD CONSTRAINT "KanitSurumu_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanitSurumu" ADD CONSTRAINT "KanitSurumu_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanitBaglantisi" ADD CONSTRAINT "KanitBaglantisi_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanitBaglantisi" ADD CONSTRAINT "KanitBaglantisi_maddeDurumuId_fkey" FOREIGN KEY ("maddeDurumuId") REFERENCES "MaddeDurumu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaddeEslestirmesi" ADD CONSTRAINT "MaddeEslestirmesi_kaynakId_fkey" FOREIGN KEY ("kaynakId") REFERENCES "Madde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaddeEslestirmesi" ADD CONSTRAINT "MaddeEslestirmesi_hedefId_fkey" FOREIGN KEY ("hedefId") REFERENCES "Madde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proje" ADD CONSTRAINT "Proje_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeBaglantisi" ADD CONSTRAINT "ProjeBaglantisi_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "Proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeBaglantisi" ADD CONSTRAINT "ProjeBaglantisi_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeBaglantisi" ADD CONSTRAINT "ProjeBaglantisi_bulguId_fkey" FOREIGN KEY ("bulguId") REFERENCES "Bulgu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeBaglantisi" ADD CONSTRAINT "ProjeBaglantisi_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeBaglantisi" ADD CONSTRAINT "ProjeBaglantisi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeBaglantisi" ADD CONSTRAINT "ProjeBaglantisi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Yetki" ADD CONSTRAINT "Yetki_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Yetki" ADD CONSTRAINT "Yetki_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Yetki" ADD CONSTRAINT "Yetki_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Yetki" ADD CONSTRAINT "Yetki_tuzelKisiId_fkey" FOREIGN KEY ("tuzelKisiId") REFERENCES "TuzelKisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AktiviteKaydi" ADD CONSTRAINT "AktiviteKaydi_aktorId_fkey" FOREIGN KEY ("aktorId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IceAktarim" ADD CONSTRAINT "IceAktarim_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IceAktarim" ADD CONSTRAINT "IceAktarim_surumId_fkey" FOREIGN KEY ("surumId") REFERENCES "FrameworkSurumu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IceAktarim" ADD CONSTRAINT "IceAktarim_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuzelKisi" ADD CONSTRAINT "TuzelKisi_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "Grup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperasyonelBirim" ADD CONSTRAINT "OperasyonelBirim_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SistemServis" ADD CONSTRAINT "SistemServis_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SistemServis" ADD CONSTRAINT "SistemServis_birimId_fkey" FOREIGN KEY ("birimId") REFERENCES "OperasyonelBirim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SistemServis" ADD CONSTRAINT "SistemServis_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SistemServis" ADD CONSTRAINT "SistemServis_ekipId_fkey" FOREIGN KEY ("ekipId") REFERENCES "Ekip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsSureci" ADD CONSTRAINT "IsSureci_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsSureciSistemi" ADD CONSTRAINT "IsSureciSistemi_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "IsSureci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsSureciSistemi" ADD CONSTRAINT "IsSureciSistemi_sistemId_fkey" FOREIGN KEY ("sistemId") REFERENCES "SistemServis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TesisProfili" ADD CONSTRAINT "TesisProfili_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkSurumu" ADD CONSTRAINT "FrameworkSurumu_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurumFarki" ADD CONSTRAINT "SurumFarki_eskiSurumId_fkey" FOREIGN KEY ("eskiSurumId") REFERENCES "FrameworkSurumu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurumFarki" ADD CONSTRAINT "SurumFarki_yeniSurumId_fkey" FOREIGN KEY ("yeniSurumId") REFERENCES "FrameworkSurumu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EskalasyonKaydi" ADD CONSTRAINT "EskalasyonKaydi_kuralId_fkey" FOREIGN KEY ("kuralId") REFERENCES "EskalasyonKurali"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulasyonKaynagi" ADD CONSTRAINT "RegulasyonKaynagi_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulasyonKaynagi" ADD CONSTRAINT "RegulasyonKaynagi_sonKontrolEdenId_fkey" FOREIGN KEY ("sonKontrolEdenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DegerlendirmeAktarimi" ADD CONSTRAINT "DegerlendirmeAktarimi_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DegerlendirmeAktarimi" ADD CONSTRAINT "DegerlendirmeAktarimi_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DegerlendirmeAktarimi" ADD CONSTRAINT "DegerlendirmeAktarimi_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DegerlendirmeAktarimi" ADD CONSTRAINT "DegerlendirmeAktarimi_kuruKosuId_fkey" FOREIGN KEY ("kuruKosuId") REFERENCES "DegerlendirmeAktarimi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DegerlendirmeAktarimi" ADD CONSTRAINT "DegerlendirmeAktarimi_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaklamaPolitikasi" ADD CONSTRAINT "SaklamaPolitikasi_guncelleyenId_fkey" FOREIGN KEY ("guncelleyenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_koyanId_fkey" FOREIGN KEY ("koyanId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_kaldiranId_fkey" FOREIGN KEY ("kaldiranId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImhaKarari" ADD CONSTRAINT "ImhaKarari_politikaId_fkey" FOREIGN KEY ("politikaId") REFERENCES "SaklamaPolitikasi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImhaKarari" ADD CONSTRAINT "ImhaKarari_onerenId_fkey" FOREIGN KEY ("onerenId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImhaKarari" ADD CONSTRAINT "ImhaKarari_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenetciErisimi" ADD CONSTRAINT "DenetciErisimi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenetciErisimi" ADD CONSTRAINT "DenetciErisimi_denetimId_fkey" FOREIGN KEY ("denetimId") REFERENCES "Denetim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenetciErisimi" ADD CONSTRAINT "DenetciErisimi_davetEdenId_fkey" FOREIGN KEY ("davetEdenId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenetciErisimi" ADD CONSTRAINT "DenetciErisimi_iptalEdenId_fkey" FOREIGN KEY ("iptalEdenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenetciKapsami" ADD CONSTRAINT "DenetciKapsami_erisimId_fkey" FOREIGN KEY ("erisimId") REFERENCES "DenetciErisimi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenetciKapsami" ADD CONSTRAINT "DenetciKapsami_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UygulanabilirlikKurali" ADD CONSTRAINT "UygulanabilirlikKurali_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UygulanabilirlikKarari" ADD CONSTRAINT "UygulanabilirlikKarari_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UygulanabilirlikKarari" ADD CONSTRAINT "UygulanabilirlikKarari_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UygulanabilirlikKarari" ADD CONSTRAINT "UygulanabilirlikKarari_kuralId_fkey" FOREIGN KEY ("kuralId") REFERENCES "UygulanabilirlikKurali"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UygulanabilirlikKarari" ADD CONSTRAINT "UygulanabilirlikKarari_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Istisna" ADD CONSTRAINT "Istisna_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Istisna" ADD CONSTRAINT "Istisna_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Istisna" ADD CONSTRAINT "Istisna_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DegerlendirmeTarihcesi" ADD CONSTRAINT "DegerlendirmeTarihcesi_maddeDurumuId_fkey" FOREIGN KEY ("maddeDurumuId") REFERENCES "MaddeDurumu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DegerlendirmeTarihcesi" ADD CONSTRAINT "DegerlendirmeTarihcesi_aktorId_fkey" FOREIGN KEY ("aktorId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UyumAnlik" ADD CONSTRAINT "UyumAnlik_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UyumAnlik" ADD CONSTRAINT "UyumAnlik_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_sistemId_fkey" FOREIGN KEY ("sistemId") REFERENCES "SistemServis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_bulguId_fkey" FOREIGN KEY ("bulguId") REFERENCES "Bulgu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskVarlik" ADD CONSTRAINT "RiskVarlik_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskVarlik" ADD CONSTRAINT "RiskVarlik_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskKontrol" ADD CONSTRAINT "RiskKontrol_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskKontrol" ADD CONSTRAINT "RiskKontrol_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denetim" ADD CONSTRAINT "Denetim_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "UyumSureci"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenetimKapsami" ADD CONSTRAINT "DenetimKapsami_denetimId_fkey" FOREIGN KEY ("denetimId") REFERENCES "Denetim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenetimKapsami" ADD CONSTRAINT "DenetimKapsami_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenetimKapsami" ADD CONSTRAINT "DenetimKapsami_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanitTalebi" ADD CONSTRAINT "KanitTalebi_denetimId_fkey" FOREIGN KEY ("denetimId") REFERENCES "Denetim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanitTalebi" ADD CONSTRAINT "KanitTalebi_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanitTalebi" ADD CONSTRAINT "KanitTalebi_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokuman" ADD CONSTRAINT "Dokuman_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokuman" ADD CONSTRAINT "Dokuman_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumanMadde" ADD CONSTRAINT "DokumanMadde_dokumanId_fkey" FOREIGN KEY ("dokumanId") REFERENCES "Dokuman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumanMadde" ADD CONSTRAINT "DokumanMadde_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumanTesis" ADD CONSTRAINT "DokumanTesis_dokumanId_fkey" FOREIGN KEY ("dokumanId") REFERENCES "Dokuman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DokumanTesis" ADD CONSTRAINT "DokumanTesis_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Varlik" ADD CONSTRAINT "Varlik_turId_fkey" FOREIGN KEY ("turId") REFERENCES "VarlikTuru"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Varlik" ADD CONSTRAINT "Varlik_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Varlik" ADD CONSTRAINT "Varlik_birimId_fkey" FOREIGN KEY ("birimId") REFERENCES "OperasyonelBirim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Varlik" ADD CONSTRAINT "Varlik_sistemId_fkey" FOREIGN KEY ("sistemId") REFERENCES "SistemServis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Varlik" ADD CONSTRAINT "Varlik_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Varlik" ADD CONSTRAINT "Varlik_emanetciId_fkey" FOREIGN KEY ("emanetciId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Varlik" ADD CONSTRAINT "Varlik_bolgeId_fkey" FOREIGN KEY ("bolgeId") REFERENCES "AgBolgesi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Varlik" ADD CONSTRAINT "Varlik_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "AgSegmenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Varlik" ADD CONSTRAINT "Varlik_ekipId_fkey" FOREIGN KEY ("ekipId") REFERENCES "Ekip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Varlik" ADD CONSTRAINT "Varlik_tedarikciId_fkey" FOREIGN KEY ("tedarikciId") REFERENCES "Tedarikci"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Varlik" ADD CONSTRAINT "Varlik_sozlesmeId_fkey" FOREIGN KEY ("sozlesmeId") REFERENCES "Sozlesme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikIliskisi" ADD CONSTRAINT "VarlikIliskisi_kaynakId_fkey" FOREIGN KEY ("kaynakId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikIliskisi" ADD CONSTRAINT "VarlikIliskisi_hedefId_fkey" FOREIGN KEY ("hedefId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgBolgesi" ADD CONSTRAINT "AgBolgesi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgGeciti" ADD CONSTRAINT "AgGeciti_kaynakBolgeId_fkey" FOREIGN KEY ("kaynakBolgeId") REFERENCES "AgBolgesi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgGeciti" ADD CONSTRAINT "AgGeciti_hedefBolgeId_fkey" FOREIGN KEY ("hedefBolgeId") REFERENCES "AgBolgesi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KimlikHesabi" ADD CONSTRAINT "KimlikHesabi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KimlikHesabi" ADD CONSTRAINT "KimlikHesabi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErisimAtamasi" ADD CONSTRAINT "ErisimAtamasi_hesapId_fkey" FOREIGN KEY ("hesapId") REFERENCES "KimlikHesabi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErisimAtamasi" ADD CONSTRAINT "ErisimAtamasi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErisimIncelemesi" ADD CONSTRAINT "ErisimIncelemesi_atamaId_fkey" FOREIGN KEY ("atamaId") REFERENCES "ErisimAtamasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErisimIncelemesi" ADD CONSTRAINT "ErisimIncelemesi_inceleyenId_fkey" FOREIGN KEY ("inceleyenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sozlesme" ADD CONSTRAINT "Sozlesme_tedarikciId_fkey" FOREIGN KEY ("tedarikciId") REFERENCES "Tedarikci"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikYazilimi" ADD CONSTRAINT "VarlikYazilimi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikYazilimi" ADD CONSTRAINT "VarlikYazilimi_yazilimId_fkey" FOREIGN KEY ("yazilimId") REFERENCES "YazilimUrunu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lisans" ADD CONSTRAINT "Lisans_yazilimId_fkey" FOREIGN KEY ("yazilimId") REFERENCES "YazilimUrunu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lisans" ADD CONSTRAINT "Lisans_sozlesmeId_fkey" FOREIGN KEY ("sozlesmeId") REFERENCES "Sozlesme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sertifika" ADD CONSTRAINT "Sertifika_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikZafiyeti" ADD CONSTRAINT "VarlikZafiyeti_zafiyetId_fkey" FOREIGN KEY ("zafiyetId") REFERENCES "Zafiyet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikZafiyeti" ADD CONSTRAINT "VarlikZafiyeti_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YedeklemeKosusu" ADD CONSTRAINT "YedeklemeKosusu_politikaId_fkey" FOREIGN KEY ("politikaId") REFERENCES "YedeklemePolitikasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeriYuklemeTesti" ADD CONSTRAINT "GeriYuklemeTesti_kosuId_fkey" FOREIGN KEY ("kosuId") REFERENCES "YedeklemeKosusu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Degisiklik" ADD CONSTRAINT "Degisiklik_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Degisiklik" ADD CONSTRAINT "Degisiklik_talepEdenId_fkey" FOREIGN KEY ("talepEdenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Degisiklik" ADD CONSTRAINT "Degisiklik_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Olay" ADD CONSTRAINT "Olay_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Olay" ADD CONSTRAINT "Olay_etkiDogrulayanId_fkey" FOREIGN KEY ("etkiDogrulayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Butce" ADD CONSTRAINT "Butce_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "Proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KilometreTasi" ADD CONSTRAINT "KilometreTasi_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "Proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeBagimliligi" ADD CONSTRAINT "ProjeBagimliligi_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "Proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeBagimliligi" ADD CONSTRAINT "ProjeBagimliligi_bagimliProjeId_fkey" FOREIGN KEY ("bagimliProjeId") REFERENCES "Proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeAdayi" ADD CONSTRAINT "ProjeAdayi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeAdayi" ADD CONSTRAINT "ProjeAdayi_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "Proje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeAdayi" ADD CONSTRAINT "ProjeAdayi_kararVerenId_fkey" FOREIGN KEY ("kararVerenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanitVarlik" ADD CONSTRAINT "KanitVarlik_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanitVarlik" ADD CONSTRAINT "KanitVarlik_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanitKapsami" ADD CONSTRAINT "KanitKapsami_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanitKapsami" ADD CONSTRAINT "KanitKapsami_kapsamOgesiId_fkey" FOREIGN KEY ("kapsamOgesiId") REFERENCES "KapsamOgesi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oturum" ADD CONSTRAINT "Oturum_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gorev" ADD CONSTRAINT "Gorev_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gorev" ADD CONSTRAINT "Gorev_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bildirim" ADD CONSTRAINT "Bildirim_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnayTalebi" ADD CONSTRAINT "OnayTalebi_talepEdenId_fkey" FOREIGN KEY ("talepEdenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnayTalebi" ADD CONSTRAINT "OnayTalebi_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntegrasyonKosusu" ADD CONSTRAINT "EntegrasyonKosusu_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connector" ADD CONSTRAINT "Connector_eslemeProfilId_fkey" FOREIGN KEY ("eslemeProfilId") REFERENCES "EslemeProfili"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EslemeProfili" ADD CONSTRAINT "EslemeProfili_olusturanId_fkey" FOREIGN KEY ("olusturanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReddedilenKayit" ADD CONSTRAINT "ReddedilenKayit_kosuId_fkey" FOREIGN KEY ("kosuId") REFERENCES "EntegrasyonKosusu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReddedilenKayit" ADD CONSTRAINT "ReddedilenKayit_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReddedilenKayit" ADD CONSTRAINT "ReddedilenKayit_inceleyenId_fkey" FOREIGN KEY ("inceleyenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeriKokeni" ADD CONSTRAINT "VeriKokeni_dogrulayanId_fkey" FOREIGN KEY ("dogrulayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KesifKaydi" ADD CONSTRAINT "KesifKaydi_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KesifKaydi" ADD CONSTRAINT "KesifKaydi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KesifKaydi" ADD CONSTRAINT "KesifKaydi_eslesenVarlikId_fkey" FOREIGN KEY ("eslesenVarlikId") REFERENCES "Varlik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KesifKaydi" ADD CONSTRAINT "KesifKaydi_inceleyenId_fkey" FOREIGN KEY ("inceleyenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KesifKaydi" ADD CONSTRAINT "KesifKaydi_yetkiKararVerenId_fkey" FOREIGN KEY ("yetkiKararVerenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopolojiAnlik" ADD CONSTRAINT "TopolojiAnlik_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopolojiAnlik" ADD CONSTRAINT "TopolojiAnlik_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopolojiGozlemi" ADD CONSTRAINT "TopolojiGozlemi_anlikId_fkey" FOREIGN KEY ("anlikId") REFERENCES "TopolojiAnlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopolojiSapmasi" ADD CONSTRAINT "TopolojiSapmasi_anlikId_fkey" FOREIGN KEY ("anlikId") REFERENCES "TopolojiAnlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopolojiSapmasi" ADD CONSTRAINT "TopolojiSapmasi_kararVerenId_fkey" FOREIGN KEY ("kararVerenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KonfigurasyonYedegi" ADD CONSTRAINT "KonfigurasyonYedegi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TedarikciErisimOturumu" ADD CONSTRAINT "TedarikciErisimOturumu_tedarikciId_fkey" FOREIGN KEY ("tedarikciId") REFERENCES "Tedarikci"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TedarikciErisimOturumu" ADD CONSTRAINT "TedarikciErisimOturumu_hesapId_fkey" FOREIGN KEY ("hesapId") REFERENCES "KimlikHesabi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TedarikciErisimOturumu" ADD CONSTRAINT "TedarikciErisimOturumu_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TedarikciErisimOturumu" ADD CONSTRAINT "TedarikciErisimOturumu_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TedarikciErisimOturumu" ADD CONSTRAINT "TedarikciErisimOturumu_sistemId_fkey" FOREIGN KEY ("sistemId") REFERENCES "SistemServis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlayVarlik" ADD CONSTRAINT "OlayVarlik_olayId_fkey" FOREIGN KEY ("olayId") REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlayVarlik" ADD CONSTRAINT "OlayVarlik_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlaySistem" ADD CONSTRAINT "OlaySistem_olayId_fkey" FOREIGN KEY ("olayId") REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlaySistem" ADD CONSTRAINT "OlaySistem_sistemId_fkey" FOREIGN KEY ("sistemId") REFERENCES "SistemServis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlayRisk" ADD CONSTRAINT "OlayRisk_olayId_fkey" FOREIGN KEY ("olayId") REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlayRisk" ADD CONSTRAINT "OlayRisk_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlayBulgu" ADD CONSTRAINT "OlayBulgu_olayId_fkey" FOREIGN KEY ("olayId") REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlayBulgu" ADD CONSTRAINT "OlayBulgu_bulguId_fkey" FOREIGN KEY ("bulguId") REFERENCES "Bulgu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlayProje" ADD CONSTRAINT "OlayProje_olayId_fkey" FOREIGN KEY ("olayId") REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlayProje" ADD CONSTRAINT "OlayProje_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "Proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlayDegisiklik" ADD CONSTRAINT "OlayDegisiklik_olayId_fkey" FOREIGN KEY ("olayId") REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlayDegisiklik" ADD CONSTRAINT "OlayDegisiklik_degisiklikId_fkey" FOREIGN KEY ("degisiklikId") REFERENCES "Degisiklik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiAnahtari" ADD CONSTRAINT "ApiAnahtari_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiAnahtari" ADD CONSTRAINT "ApiAnahtari_olusturanId_fkey" FOREIGN KEY ("olusturanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiIstegi" ADD CONSTRAINT "ApiIstegi_anahtarId_fkey" FOREIGN KEY ("anahtarId") REFERENCES "ApiAnahtari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikAktarimi" ADD CONSTRAINT "VarlikAktarimi_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikAktarimi" ADD CONSTRAINT "VarlikAktarimi_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgSegmenti" ADD CONSTRAINT "AgSegmenti_bolgeId_fkey" FOREIGN KEY ("bolgeId") REFERENCES "AgBolgesi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlanUygulanabilirligi" ADD CONSTRAINT "AlanUygulanabilirligi_kaydedenId_fkey" FOREIGN KEY ("kaydedenId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YamaKaydi" ADD CONSTRAINT "YamaKaydi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmwareTemeli" ADD CONSTRAINT "FirmwareTemeli_turId_fkey" FOREIGN KEY ("turId") REFERENCES "VarlikTuru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmwareUyumu" ADD CONSTRAINT "FirmwareUyumu_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmwareUyumu" ADD CONSTRAINT "FirmwareUyumu_temelId_fkey" FOREIGN KEY ("temelId") REFERENCES "FirmwareTemeli"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisoryUrunu" ADD CONSTRAINT "AdvisoryUrunu_advisoryId_fkey" FOREIGN KEY ("advisoryId") REFERENCES "Advisory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisoryZafiyeti" ADD CONSTRAINT "AdvisoryZafiyeti_advisoryId_fkey" FOREIGN KEY ("advisoryId") REFERENCES "Advisory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisoryZafiyeti" ADD CONSTRAINT "AdvisoryZafiyeti_zafiyetId_fkey" FOREIGN KEY ("zafiyetId") REFERENCES "Zafiyet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZafiyetKorelasyonu" ADD CONSTRAINT "ZafiyetKorelasyonu_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZafiyetKorelasyonu" ADD CONSTRAINT "ZafiyetKorelasyonu_zafiyetId_fkey" FOREIGN KEY ("zafiyetId") REFERENCES "Zafiyet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbomBelgesi" ADD CONSTRAINT "SbomBelgesi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbomBelgesi" ADD CONSTRAINT "SbomBelgesi_yazilimId_fkey" FOREIGN KEY ("yazilimId") REFERENCES "YazilimUrunu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbomBelgesi" ADD CONSTRAINT "SbomBelgesi_yukleyenId_fkey" FOREIGN KEY ("yukleyenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbomGirdisi" ADD CONSTRAINT "SbomGirdisi_sbomId_fkey" FOREIGN KEY ("sbomId") REFERENCES "SbomBelgesi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbomGirdisi" ADD CONSTRAINT "SbomGirdisi_bilesenId_fkey" FOREIGN KEY ("bilesenId") REFERENCES "YazilimBileseni"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuvenlikKapsami" ADD CONSTRAINT "GuvenlikKapsami_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProsesAdimi" ADD CONSTRAINT "ProsesAdimi_surecId_fkey" FOREIGN KEY ("surecId") REFERENCES "IsSureci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdimVarligi" ADD CONSTRAINT "AdimVarligi_adimId_fkey" FOREIGN KEY ("adimId") REFERENCES "ProsesAdimi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdimVarligi" ADD CONSTRAINT "AdimVarligi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtkiDegerlendirmesi" ADD CONSTRAINT "EtkiDegerlendirmesi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtkiDegerlendirmesi" ADD CONSTRAINT "EtkiDegerlendirmesi_degerlendirenId_fkey" FOREIGN KEY ("degerlendirenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ekip" ADD CONSTRAINT "Ekip_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EkipUyeligi" ADD CONSTRAINT "EkipUyeligi_ekipId_fkey" FOREIGN KEY ("ekipId") REFERENCES "Ekip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EkipUyeligi" ADD CONSTRAINT "EkipUyeligi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KonfigTemeli" ADD CONSTRAINT "KonfigTemeli_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KonfigTemeli" ADD CONSTRAINT "KonfigTemeli_yedekId_fkey" FOREIGN KEY ("yedekId") REFERENCES "KonfigurasyonYedegi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KonfigTemeli" ADD CONSTRAINT "KonfigTemeli_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KonfigSapmasi" ADD CONSTRAINT "KonfigSapmasi_temelId_fkey" FOREIGN KEY ("temelId") REFERENCES "KonfigTemeli"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KonfigSapmasi" ADD CONSTRAINT "KonfigSapmasi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KonfigSapmasi" ADD CONSTRAINT "KonfigSapmasi_yedekId_fkey" FOREIGN KEY ("yedekId") REFERENCES "KonfigurasyonYedegi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KonfigSapmasi" ADD CONSTRAINT "KonfigSapmasi_kararVerenId_fkey" FOREIGN KEY ("kararVerenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvanterSayimi" ADD CONSTRAINT "EnvanterSayimi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvanterSayimi" ADD CONSTRAINT "EnvanterSayimi_turId_fkey" FOREIGN KEY ("turId") REFERENCES "VarlikTuru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvanterSayimi" ADD CONSTRAINT "EnvanterSayimi_bolgeId_fkey" FOREIGN KEY ("bolgeId") REFERENCES "AgBolgesi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvanterSayimi" ADD CONSTRAINT "EnvanterSayimi_acanId_fkey" FOREIGN KEY ("acanId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvanterSayimi" ADD CONSTRAINT "EnvanterSayimi_kapatanId_fkey" FOREIGN KEY ("kapatanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SayimSatiri" ADD CONSTRAINT "SayimSatiri_sayimId_fkey" FOREIGN KEY ("sayimId") REFERENCES "EnvanterSayimi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SayimSatiri" ADD CONSTRAINT "SayimSatiri_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SayimSatiri" ADD CONSTRAINT "SayimSatiri_sayanId_fkey" FOREIGN KEY ("sayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YedekParca" ADD CONSTRAINT "YedekParca_turId_fkey" FOREIGN KEY ("turId") REFERENCES "VarlikTuru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YedekParca" ADD CONSTRAINT "YedekParca_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YedekParca" ADD CONSTRAINT "YedekParca_tedarikciId_fkey" FOREIGN KEY ("tedarikciId") REFERENCES "Tedarikci"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YedekParcaVarlik" ADD CONSTRAINT "YedekParcaVarlik_parcaId_fkey" FOREIGN KEY ("parcaId") REFERENCES "YedekParca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YedekParcaVarlik" ADD CONSTRAINT "YedekParcaVarlik_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TasinabilirMedya" ADD CONSTRAINT "TasinabilirMedya_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TasinabilirMedya" ADD CONSTRAINT "TasinabilirMedya_sahibiId_fkey" FOREIGN KEY ("sahibiId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedyaKullanimi" ADD CONSTRAINT "MedyaKullanimi_medyaId_fkey" FOREIGN KEY ("medyaId") REFERENCES "TasinabilirMedya"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedyaKullanimi" ADD CONSTRAINT "MedyaKullanimi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedyaKullanimi" ADD CONSTRAINT "MedyaKullanimi_onaylayanId_fkey" FOREIGN KEY ("onaylayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BildirimYukumlulugu" ADD CONSTRAINT "BildirimYukumlulugu_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BildirimYukumlulugu" ADD CONSTRAINT "BildirimYukumlulugu_guncelleyenId_fkey" FOREIGN KEY ("guncelleyenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BildirimDonemi" ADD CONSTRAINT "BildirimDonemi_yukumlulukId_fkey" FOREIGN KEY ("yukumlulukId") REFERENCES "BildirimYukumlulugu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BildirimDonemi" ADD CONSTRAINT "BildirimDonemi_verenId_fkey" FOREIGN KEY ("verenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BildirimDonemi" ADD CONSTRAINT "BildirimDonemi_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BildirimKaydi" ADD CONSTRAINT "BildirimKaydi_olayId_fkey" FOREIGN KEY ("olayId") REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BildirimKaydi" ADD CONSTRAINT "BildirimKaydi_yukumlulukId_fkey" FOREIGN KEY ("yukumlulukId") REFERENCES "BildirimYukumlulugu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BildirimKaydi" ADD CONSTRAINT "BildirimKaydi_gonderenId_fkey" FOREIGN KEY ("gonderenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BildirimKaydi" ADD CONSTRAINT "BildirimKaydi_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KontrolTesti" ADD CONSTRAINT "KontrolTesti_maddeDurumuId_fkey" FOREIGN KEY ("maddeDurumuId") REFERENCES "MaddeDurumu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KontrolTesti" ADD CONSTRAINT "KontrolTesti_testEdenId_fkey" FOREIGN KEY ("testEdenId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YonetimGozdenGecirme" ADD CONSTRAINT "YonetimGozdenGecirme_regulasyonId_fkey" FOREIGN KEY ("regulasyonId") REFERENCES "Regulasyon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YonetimGozdenGecirme" ADD CONSTRAINT "YonetimGozdenGecirme_yurutenId_fkey" FOREIGN KEY ("yurutenId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GozdenGecirmeKarari" ADD CONSTRAINT "GozdenGecirmeKarari_gozdenGecirmeId_fkey" FOREIGN KEY ("gozdenGecirmeId") REFERENCES "YonetimGozdenGecirme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GozdenGecirmeKarari" ADD CONSTRAINT "GozdenGecirmeKarari_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GozdenGecirmeKarari" ADD CONSTRAINT "GozdenGecirmeKarari_gorevId_fkey" FOREIGN KEY ("gorevId") REFERENCES "Gorev"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EgitimKaydi" ADD CONSTRAINT "EgitimKaydi_egitimId_fkey" FOREIGN KEY ("egitimId") REFERENCES "Egitim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EgitimKaydi" ADD CONSTRAINT "EgitimKaydi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EgitimKaydi" ADD CONSTRAINT "EgitimKaydi_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EgitimMadde" ADD CONSTRAINT "EgitimMadde_egitimId_fkey" FOREIGN KEY ("egitimId") REFERENCES "Egitim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EgitimMadde" ADD CONSTRAINT "EgitimMadde_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikAtamaTalebi" ADD CONSTRAINT "VarlikAtamaTalebi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikAtamaTalebi" ADD CONSTRAINT "VarlikAtamaTalebi_atananId_fkey" FOREIGN KEY ("atananId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikAtamaTalebi" ADD CONSTRAINT "VarlikAtamaTalebi_atayanId_fkey" FOREIGN KEY ("atayanId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikAtamaTalebi" ADD CONSTRAINT "VarlikAtamaTalebi_oncekiSahipId_fkey" FOREIGN KEY ("oncekiSahipId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikAtamaTalebi" ADD CONSTRAINT "VarlikAtamaTalebi_iptalEdenId_fkey" FOREIGN KEY ("iptalEdenId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikDurusGozlemi" ADD CONSTRAINT "VarlikDurusGozlemi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarlikDurusGozlemi" ADD CONSTRAINT "VarlikDurusGozlemi_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcerikPaketiSurumu" ADD CONSTRAINT "IcerikPaketiSurumu_paketId_fkey" FOREIGN KEY ("paketId") REFERENCES "IcerikPaketi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcerikPaketiSurumu" ADD CONSTRAINT "IcerikPaketiSurumu_kuranId_fkey" FOREIGN KEY ("kuranId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSablonu" ADD CONSTRAINT "FormSablonu_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaporSablonu" ADD CONSTRAINT "RaporSablonu_sektorId_fkey" FOREIGN KEY ("sektorId") REFERENCES "Sektor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KimlikBagi" ADD CONSTRAINT "KimlikBagi_saglayiciId_fkey" FOREIGN KEY ("saglayiciId") REFERENCES "KimlikSaglayici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KimlikBagi" ADD CONSTRAINT "KimlikBagi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaKaydi" ADD CONSTRAINT "MfaKaydi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaKurtarmaKodu" ADD CONSTRAINT "MfaKurtarmaKodu_kayitId_fkey" FOREIGN KEY ("kayitId") REFERENCES "MfaKaydi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MevzuatTaramasi" ADD CONSTRAINT "MevzuatTaramasi_kaynakId_fkey" FOREIGN KEY ("kaynakId") REFERENCES "MevzuatKaynagi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MevzuatDegisiklikAdayi" ADD CONSTRAINT "MevzuatDegisiklikAdayi_kaynakId_fkey" FOREIGN KEY ("kaynakId") REFERENCES "MevzuatKaynagi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeriIslemeFaaliyeti" ADD CONSTRAINT "VeriIslemeFaaliyeti_isSureciId_fkey" FOREIGN KEY ("isSureciId") REFERENCES "IsSureci"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeriIslemeFaaliyeti" ADD CONSTRAINT "VeriIslemeFaaliyeti_saklamaPolitikasiId_fkey" FOREIGN KEY ("saklamaPolitikasiId") REFERENCES "SaklamaPolitikasi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeriIslemeFaaliyeti" ADD CONSTRAINT "VeriIslemeFaaliyeti_maddeId_fkey" FOREIGN KEY ("maddeId") REFERENCES "Madde"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YurtDisiAktarim" ADD CONSTRAINT "YurtDisiAktarim_faaliyetId_fkey" FOREIGN KEY ("faaliyetId") REFERENCES "VeriIslemeFaaliyeti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeriSahibiBasvurusu" ADD CONSTRAINT "VeriSahibiBasvurusu_yanitlayanId_fkey" FOREIGN KEY ("yanitlayanId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SicilKaydi" ADD CONSTRAINT "SicilKaydi_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlayVeriFaaliyeti" ADD CONSTRAINT "OlayVeriFaaliyeti_olayId_fkey" FOREIGN KEY ("olayId") REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlayVeriFaaliyeti" ADD CONSTRAINT "OlayVeriFaaliyeti_faaliyetId_fkey" FOREIGN KEY ("faaliyetId") REFERENCES "VeriIslemeFaaliyeti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════
-- ELLE YAZILAN DDL · PostgreSQL karşılıkları (R5)
--
-- `prisma migrate diff` YALNIZ Prisma modelini görür. SQLite göç zinciri
-- bunun DIŞINDA da DDL taşıyor: tetikleyiciler, kısmi (partial) tekil
-- indeksler ve ifade indeksleri. Bunlar taban göçüne elle eklenmezse
-- PostgreSQL kurulumu "şema farkı 0" der ve YİNE DE korumasız kalır —
-- ölçüldü (9 Eylül 2026, R5): PostgreSQL'de koşulan test kümesinde
-- `faz-d-eylem` · `yaris-kosullari` · `zimmet-eylem` · `erisim` kırmızı
-- yandı, çünkü iki tetikleyici ve üç indeks yoktu. Kapı artık iki
-- sağlayıcının NESNE ENVANTERİNİ karşılaştırıyor (`arac/pg-goc.mjs`):
-- SQLite'ta olup PostgreSQL'de olmayan tetikleyici/indeks KIRMIZIDIR.
--
-- ── 1 · DENETİM İZİ DEĞİŞMEZLİĞİ
--
-- SQLite tarafı: prisma/migrations/20260830190000_denetim_izi_degismezligi
-- (`RAISE(ABORT, …)`; PostgreSQL'de SÖZDİZİMİ HATASIDIR — tetikleyici
-- gövdesi doğrudan yazılamaz, fonksiyon gerekir).
--
-- ÜÇ FARK, üçü de sessizdir:
--  1. `FOR EACH ROW` ZORUNLU. `FOR EACH STATEMENT` yazılırsa hiçbir satıra
--     dokunmayan `UPDATE … WHERE (yanlış)` bile reddedilir; SQLite'ta
--     reddedilmez. Davranış farkı hiçbir hata vermez.
--  2. TRUNCATE SQLite'ta YOKTUR; PostgreSQL'de vardır ve SATIR
--     tetikleyicilerini ATLAR. İki TRUNCATE tetikleyicisi olmadan
--     "denetim izi değişmezdir" iddiası PostgreSQL'de YALANDIR — bu
--     yüzden altı tetikleyici vardır, dört değil.
--  3. Tablo SAHİBİ `ALTER TABLE … DISABLE TRIGGER` diyebilir. Uygulama
--     rolü tablo sahibi OLMAMALIDIR (docs/POSTGRES_READINESS.md §e.6).
--
-- Mesaj metinleri SQLite tarafıyla AYNI tutulur: iki sağlayıcıda aynı
-- hatayı arayan test ve günlük ayrışmasın.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION denetim_izi_degismez()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '%', TG_ARGV[0]
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

CREATE TRIGGER aktivite_guncelleme_yasak
  BEFORE UPDATE ON "AktiviteKaydi"
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez('Denetim izi kayitlari degistirilemez');

CREATE TRIGGER aktivite_silme_yasak
  BEFORE DELETE ON "AktiviteKaydi"
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez('Denetim izi kayitlari silinemez');

CREATE TRIGGER degerlendirme_tarihcesi_guncelleme_yasak
  BEFORE UPDATE ON "DegerlendirmeTarihcesi"
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez('Degerlendirme tarihcesi degistirilemez');

CREATE TRIGGER degerlendirme_tarihcesi_silme_yasak
  BEFORE DELETE ON "DegerlendirmeTarihcesi"
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez('Degerlendirme tarihcesi silinemez');

CREATE TRIGGER aktivite_truncate_yasak
  BEFORE TRUNCATE ON "AktiviteKaydi"
  FOR EACH STATEMENT EXECUTE FUNCTION denetim_izi_degismez('Denetim izi kayitlari bosaltilamaz');

CREATE TRIGGER degerlendirme_tarihcesi_truncate_yasak
  BEFORE TRUNCATE ON "DegerlendirmeTarihcesi"
  FOR EACH STATEMENT EXECUTE FUNCTION denetim_izi_degismez('Degerlendirme tarihcesi bosaltilamaz');


-- ═══════════════════════════════════════════════════════════════════════
-- 2 · KANIT SÜRÜM GEÇMİŞİ DEĞİŞMEZLİĞİ
-- SQLite karşılığı: prisma/migrations/20260903192431_faz_d_uyum_kanit
-- (`kanit_surumu_guncelleme_yasak` · `kanit_surumu_silme_yasak`).
-- ═══════════════════════════════════════════════════════════════════════

CREATE TRIGGER kanit_surumu_guncelleme_yasak
  BEFORE UPDATE ON "KanitSurumu"
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez('Kanit surum gecmisi degistirilemez');

CREATE TRIGGER kanit_surumu_silme_yasak
  BEFORE DELETE ON "KanitSurumu"
  FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez('Kanit surum gecmisi silinemez');

CREATE TRIGGER kanit_surumu_truncate_yasak
  BEFORE TRUNCATE ON "KanitSurumu"
  FOR EACH STATEMENT EXECUTE FUNCTION denetim_izi_degismez('Kanit surum gecmisi bosaltilamaz');

-- ═══════════════════════════════════════════════════════════════════════
-- 3 · KISMİ VE İFADE İNDEKSLERİ — Prisma şemasında YAZILAMAZ
--
-- Üçü de uygulama katmanının atlanabildiği yerlerde durur: kısıt
-- veritabanındadır, çünkü "önce oku sonra yaz" kalıbı eşzamanlı iki
-- yazmada ikisini de geçirir.
-- ═══════════════════════════════════════════════════════════════════════

-- Bir regülasyonda YALNIZ BİR aktif sürüm (SQLite: 20260901201000).
-- Arşiv ve taslak sürümler indekse girmez.
CREATE UNIQUE INDEX "FrameworkSurumu_tekAktif"
  ON "FrameworkSurumu"("regulasyonId") WHERE "durum" = 'aktif';

-- Bir varlık için aynı anda tek BEKLEYEN atama talebi (SQLite: 20260904084500).
CREATE UNIQUE INDEX "VarlikAtamaTalebi_tek_aktif"
  ON "VarlikAtamaTalebi"("varlikId") WHERE "durum" = 'bekliyor';

-- Erişim atamasının NULL'lu üçlüsü de tekildir (SQLite: 20260901210000).
-- SQLite `char(31)` yazar, PostgreSQL'de aynı işi `chr(31)` görür: ikisi de
-- birim ayracıdır. `NULLS NOT DISTINCT` yerine ifade indeksi seçildi ki
-- iki sağlayıcıda AYNI kural dursun ve SQLite tarafı değişmesin.
CREATE UNIQUE INDEX "ErisimAtamasi_tekil_coalesce_key"
  ON "ErisimAtamasi"("hesapId", COALESCE("varlikId", chr(31)), COALESCE("kapsam", chr(31)));
