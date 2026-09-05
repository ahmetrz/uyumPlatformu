-- Entegrasyon ve otomasyon katmanı.
-- Tümü ADDITIVE: yeni tablolar + mevcut tablolara nullable/varsayılanlı
-- kolonlar. Hiçbir kolon silinmez, tipi değişmez; veri kaybı yoktur.

-- ── EntegrasyonKosusu: taslak modelden gerçek koşu kaydına ────────────
-- Sayaçlar ayrı: "alınan" ile "kabul edilen" aynı şey değildir ve
-- reddedilen kayıt sessizce yok sayılmaz.
ALTER TABLE "EntegrasyonKosusu" ADD COLUMN "connectorId" TEXT;
ALTER TABLE "EntegrasyonKosusu" ADD COLUMN "tetikleyen" TEXT NOT NULL DEFAULT 'manuel';
ALTER TABLE "EntegrasyonKosusu" ADD COLUMN "alinan" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EntegrasyonKosusu" ADD COLUMN "kabulEdilen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EntegrasyonKosusu" ADD COLUMN "reddedilen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EntegrasyonKosusu" ADD COLUMN "yinelenen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EntegrasyonKosusu" ADD COLUMN "sureMs" INTEGER;
ALTER TABLE "EntegrasyonKosusu" ADD COLUMN "denemeNo" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "EntegrasyonKosusu" ADD COLUMN "imlecOnce" TEXT;
ALTER TABLE "EntegrasyonKosusu" ADD COLUMN "imlecSonra" TEXT;
CREATE INDEX "EntegrasyonKosusu_connectorId_baslangic_idx"
  ON "EntegrasyonKosusu"("connectorId", "baslangic");

-- ── Olay: etki zinciri alanları ───────────────────────────────────────
-- Etki boyutları AYRI: bir olay üretimi durdurmadan regülasyon bildirimi
-- doğurabilir. null = değerlendirilmedi (etkisiz DEĞİL).
ALTER TABLE "Olay" ADD COLUMN "tespitKaynagi" TEXT;
ALTER TABLE "Olay" ADD COLUMN "uretimEtkisi" TEXT;
ALTER TABLE "Olay" ADD COLUMN "emniyetEtkisi" TEXT;
ALTER TABLE "Olay" ADD COLUMN "regulasyonEtkisi" TEXT;
ALTER TABLE "Olay" ADD COLUMN "siberEtki" TEXT;
ALTER TABLE "Olay" ADD COLUMN "kokNeden" TEXT;
ALTER TABLE "Olay" ADD COLUMN "sinirlama" TEXT;
ALTER TABLE "Olay" ADD COLUMN "kurtarma" TEXT;
ALTER TABLE "Olay" ADD COLUMN "ogrenilenler" TEXT;
ALTER TABLE "Olay" ADD COLUMN "bildirimGerekli" BOOLEAN;
ALTER TABLE "Olay" ADD COLUMN "bildirimTarihi" DATETIME;
ALTER TABLE "Olay" ADD COLUMN "etkiOnerisiJson" TEXT;
ALTER TABLE "Olay" ADD COLUMN "etkiDogrulayanId" TEXT;
ALTER TABLE "Olay" ADD COLUMN "etkiDogrulamaZamani" DATETIME;

-- ── Connector ─────────────────────────────────────────────────────────
CREATE TABLE "Connector" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kod" TEXT NOT NULL,
  "ad" TEXT NOT NULL,
  "tip" TEXT NOT NULL,
  "durum" TEXT NOT NULL DEFAULT 'taslak',
  "kaynakSistem" TEXT NOT NULL,
  "kimlikTipi" TEXT NOT NULL DEFAULT 'none',
  "yapilandirmaJson" TEXT,
  "sirReferansi" TEXT,
  "pollAralikDk" INTEGER,
  "sonBasariliKosu" DATETIME,
  "sonHata" TEXT,
  "etkin" BOOLEAN NOT NULL DEFAULT false,
  "imlec" TEXT,
  "silindi" DATETIME,
  "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "guncellendi" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Connector_kod_key" ON "Connector"("kod");
CREATE INDEX "Connector_tip_etkin_idx" ON "Connector"("tip", "etkin");

-- ── VeriKokeni ────────────────────────────────────────────────────────
-- Kaynağı gerçekten bilinmeyen kayıt için satır AÇILMAZ; kökeni olmayan
-- kayıt manueldir. guven null = ölçülmedi, 0 değil.
CREATE TABLE "VeriKokeni" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "varlikTipi" TEXT NOT NULL,
  "varlikId" TEXT NOT NULL,
  "kokenTipi" TEXT NOT NULL,
  "kaynakSistem" TEXT NOT NULL,
  "kaynakKayitId" TEXT,
  "connectorId" TEXT,
  "kosuId" TEXT,
  "toplanma" DATETIME,
  "aktarim" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "guven" REAL,
  "dogrulamaDurumu" TEXT NOT NULL DEFAULT 'dogrulanmadi',
  "dogrulayanId" TEXT,
  "dogrulamaZamani" DATETIME,
  CONSTRAINT "VeriKokeni_dogrulayanId_fkey" FOREIGN KEY ("dogrulayanId")
    REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VeriKokeni_varlikTipi_varlikId_kaynakSistem_kaynakKayitId_key"
  ON "VeriKokeni"("varlikTipi", "varlikId", "kaynakSistem", "kaynakKayitId");
CREATE INDEX "VeriKokeni_varlikTipi_varlikId_idx" ON "VeriKokeni"("varlikTipi", "varlikId");
CREATE INDEX "VeriKokeni_kokenTipi_dogrulamaDurumu_idx"
  ON "VeriKokeni"("kokenTipi", "dogrulamaDurumu");

-- ── KesifKaydi (OT discovery staging) ─────────────────────────────────
-- Keşfedilen kayıt CMDB'ye doğrudan yazılmaz.
CREATE TABLE "KesifKaydi" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "connectorId" TEXT,
  "kosuId" TEXT,
  "kaynak" TEXT NOT NULL,
  "kaynakKayitId" TEXT NOT NULL,
  "hamJson" TEXT NOT NULL,
  "normalJson" TEXT,
  "durum" TEXT NOT NULL DEFAULT 'kesfedildi',
  "eslesenVarlikId" TEXT,
  "eslesmeAnahtari" TEXT,
  "guvenSkoru" REAL,
  "inceleyenId" TEXT,
  "incelemeZamani" DATETIME,
  "incelemeNotu" TEXT,
  "ilkGorulme" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sonGorulme" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KesifKaydi_connectorId_fkey" FOREIGN KEY ("connectorId")
    REFERENCES "Connector"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "KesifKaydi_eslesenVarlikId_fkey" FOREIGN KEY ("eslesenVarlikId")
    REFERENCES "Varlik"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "KesifKaydi_inceleyenId_fkey" FOREIGN KEY ("inceleyenId")
    REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "KesifKaydi_kaynak_kaynakKayitId_key" ON "KesifKaydi"("kaynak", "kaynakKayitId");
CREATE INDEX "KesifKaydi_durum_sonGorulme_idx" ON "KesifKaydi"("durum", "sonGorulme");

-- ── Topoloji: anlık / gözlem / sapma ──────────────────────────────────
CREATE TABLE "TopolojiAnlik" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tesisId" TEXT,
  "kaynak" TEXT NOT NULL,
  "alindi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ozetHash" TEXT NOT NULL,
  "temelMi" BOOLEAN NOT NULL DEFAULT false,
  "onaylayanId" TEXT,
  "onayZamani" DATETIME,
  "not" TEXT,
  CONSTRAINT "TopolojiAnlik_tesisId_fkey" FOREIGN KEY ("tesisId")
    REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TopolojiAnlik_onaylayanId_fkey" FOREIGN KEY ("onaylayanId")
    REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "TopolojiAnlik_tesisId_alindi_idx" ON "TopolojiAnlik"("tesisId", "alindi");

CREATE TABLE "TopolojiGozlemi" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "anlikId" TEXT NOT NULL,
  "tip" TEXT NOT NULL,
  "anahtar" TEXT NOT NULL,
  "ozellikJson" TEXT NOT NULL,
  CONSTRAINT "TopolojiGozlemi_anlikId_fkey" FOREIGN KEY ("anlikId")
    REFERENCES "TopolojiAnlik"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TopolojiGozlemi_anlikId_tip_idx" ON "TopolojiGozlemi"("anlikId", "tip");

CREATE TABLE "TopolojiSapmasi" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tesisId" TEXT,
  "anlikId" TEXT NOT NULL,
  "tip" TEXT NOT NULL,
  "siddet" TEXT NOT NULL DEFAULT 'orta',
  "aciklama" TEXT NOT NULL,
  "oncekiJson" TEXT,
  "sonrakiJson" TEXT,
  "durum" TEXT NOT NULL DEFAULT 'gozlendi',
  "kararVerenId" TEXT,
  "kararZamani" DATETIME,
  "kararGerekcesi" TEXT,
  "uretilenRiskId" TEXT,
  "uretilenBulguId" TEXT,
  "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TopolojiSapmasi_anlikId_fkey" FOREIGN KEY ("anlikId")
    REFERENCES "TopolojiAnlik"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TopolojiSapmasi_kararVerenId_fkey" FOREIGN KEY ("kararVerenId")
    REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "TopolojiSapmasi_durum_siddet_idx" ON "TopolojiSapmasi"("durum", "siddet");

-- ── KonfigurasyonYedegi ───────────────────────────────────────────────
CREATE TABLE "KonfigurasyonYedegi" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "varlikId" TEXT NOT NULL,
  "kaynakSistem" TEXT NOT NULL,
  "yedekZamani" DATETIME NOT NULL,
  "surum" TEXT,
  "icerikHash" TEXT,
  "basarili" BOOLEAN NOT NULL DEFAULT true,
  "dogrulandi" BOOLEAN NOT NULL DEFAULT false,
  "dogrulamaZamani" DATETIME,
  "restoreTestId" TEXT,
  "depolamaKonumu" TEXT,
  "saklamaGun" INTEGER,
  "sonBilinenIyi" BOOLEAN NOT NULL DEFAULT false,
  "hata" TEXT,
  CONSTRAINT "KonfigurasyonYedegi_varlikId_fkey" FOREIGN KEY ("varlikId")
    REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "KonfigurasyonYedegi_varlikId_yedekZamani_idx"
  ON "KonfigurasyonYedegi"("varlikId", "yedekZamani");

-- ── TedarikciErisimOturumu ────────────────────────────────────────────
-- onayli/mfaVar/izlendi null = BİLİNMİYOR (onaysız/izlenmiyor değil).
CREATE TABLE "TedarikciErisimOturumu" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tedarikciId" TEXT NOT NULL,
  "hesapId" TEXT,
  "tesisId" TEXT,
  "varlikId" TEXT,
  "sistemId" TEXT,
  "baslangic" DATETIME NOT NULL,
  "bitis" DATETIME,
  "kaynakSistem" TEXT NOT NULL,
  "onayli" BOOLEAN,
  "mfaVar" BOOLEAN,
  "izlendi" BOOLEAN,
  "talepReferansi" TEXT,
  "kayitReferansi" TEXT,
  "durum" TEXT NOT NULL DEFAULT 'tamamlandi',
  CONSTRAINT "TedarikciErisimOturumu_tedarikciId_fkey" FOREIGN KEY ("tedarikciId")
    REFERENCES "Tedarikci"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TedarikciErisimOturumu_hesapId_fkey" FOREIGN KEY ("hesapId")
    REFERENCES "KimlikHesabi"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TedarikciErisimOturumu_tesisId_fkey" FOREIGN KEY ("tesisId")
    REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TedarikciErisimOturumu_varlikId_fkey" FOREIGN KEY ("varlikId")
    REFERENCES "Varlik"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TedarikciErisimOturumu_sistemId_fkey" FOREIGN KEY ("sistemId")
    REFERENCES "SistemServis"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "TedarikciErisimOturumu_tedarikciId_baslangic_idx"
  ON "TedarikciErisimOturumu"("tedarikciId", "baslangic");

-- ── Olay etki zinciri bağ tabloları ───────────────────────────────────
CREATE TABLE "OlayVarlik" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "olayId" TEXT NOT NULL,
  "varlikId" TEXT NOT NULL,
  "rol" TEXT NOT NULL DEFAULT 'etkilenen',
  CONSTRAINT "OlayVarlik_olayId_fkey" FOREIGN KEY ("olayId")
    REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OlayVarlik_varlikId_fkey" FOREIGN KEY ("varlikId")
    REFERENCES "Varlik"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OlayVarlik_olayId_varlikId_key" ON "OlayVarlik"("olayId", "varlikId");

CREATE TABLE "OlaySistem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "olayId" TEXT NOT NULL,
  "sistemId" TEXT NOT NULL,
  "rol" TEXT NOT NULL DEFAULT 'etkilenen',
  CONSTRAINT "OlaySistem_olayId_fkey" FOREIGN KEY ("olayId")
    REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OlaySistem_sistemId_fkey" FOREIGN KEY ("sistemId")
    REFERENCES "SistemServis"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OlaySistem_olayId_sistemId_key" ON "OlaySistem"("olayId", "sistemId");

CREATE TABLE "OlayRisk" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "olayId" TEXT NOT NULL,
  "riskId" TEXT NOT NULL,
  CONSTRAINT "OlayRisk_olayId_fkey" FOREIGN KEY ("olayId")
    REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OlayRisk_riskId_fkey" FOREIGN KEY ("riskId")
    REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OlayRisk_olayId_riskId_key" ON "OlayRisk"("olayId", "riskId");

CREATE TABLE "OlayBulgu" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "olayId" TEXT NOT NULL,
  "bulguId" TEXT NOT NULL,
  CONSTRAINT "OlayBulgu_olayId_fkey" FOREIGN KEY ("olayId")
    REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OlayBulgu_bulguId_fkey" FOREIGN KEY ("bulguId")
    REFERENCES "Bulgu"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OlayBulgu_olayId_bulguId_key" ON "OlayBulgu"("olayId", "bulguId");

CREATE TABLE "OlayProje" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "olayId" TEXT NOT NULL,
  "projeId" TEXT NOT NULL,
  CONSTRAINT "OlayProje_olayId_fkey" FOREIGN KEY ("olayId")
    REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OlayProje_projeId_fkey" FOREIGN KEY ("projeId")
    REFERENCES "Proje"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OlayProje_olayId_projeId_key" ON "OlayProje"("olayId", "projeId");

CREATE TABLE "OlayDegisiklik" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "olayId" TEXT NOT NULL,
  "degisiklikId" TEXT NOT NULL,
  CONSTRAINT "OlayDegisiklik_olayId_fkey" FOREIGN KEY ("olayId")
    REFERENCES "Olay"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OlayDegisiklik_degisiklikId_fkey" FOREIGN KEY ("degisiklikId")
    REFERENCES "Degisiklik"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OlayDegisiklik_olayId_degisiklikId_key"
  ON "OlayDegisiklik"("olayId", "degisiklikId");

-- ── API katmanı ───────────────────────────────────────────────────────
-- Token saklanmaz; yalnız SHA-256 özeti tutulur (oturum kalıbıyla aynı).
CREATE TABLE "ApiAnahtari" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ad" TEXT NOT NULL,
  "kullaniciId" TEXT NOT NULL,
  "onEk" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "sonKullanim" DATETIME,
  "bitis" DATETIME,
  "iptalZamani" DATETIME,
  "olusturanId" TEXT,
  "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiAnahtari_kullaniciId_fkey" FOREIGN KEY ("kullaniciId")
    REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApiAnahtari_olusturanId_fkey" FOREIGN KEY ("olusturanId")
    REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ApiAnahtari_tokenHash_key" ON "ApiAnahtari"("tokenHash");
CREATE INDEX "ApiAnahtari_kullaniciId_idx" ON "ApiAnahtari"("kullaniciId");

CREATE TABLE "ApiIstegi" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "anahtarId" TEXT,
  "yontem" TEXT NOT NULL,
  "yol" TEXT NOT NULL,
  "idempotencyAnahtari" TEXT,
  "durumKodu" INTEGER NOT NULL,
  "yanitOzeti" TEXT,
  "hataKodu" TEXT,
  "sureMs" INTEGER,
  "zaman" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiIstegi_anahtarId_fkey" FOREIGN KEY ("anahtarId")
    REFERENCES "ApiAnahtari"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ApiIstegi_anahtarId_idempotencyAnahtari_key"
  ON "ApiIstegi"("anahtarId", "idempotencyAnahtari");
CREATE INDEX "ApiIstegi_yol_zaman_idx" ON "ApiIstegi"("yol", "zaman");

-- ── VarlikAktarimi (CMDB toplu import) ────────────────────────────────
CREATE TABLE "VarlikAktarimi" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  "onayZamani" DATETIME,
  "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VarlikAktarimi_yukleyenId_fkey" FOREIGN KEY ("yukleyenId")
    REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "VarlikAktarimi_onaylayanId_fkey" FOREIGN KEY ("onaylayanId")
    REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
