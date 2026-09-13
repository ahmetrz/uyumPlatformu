-- P6 · KİMLİK VE SSO
--
-- Beş tablo, tek karar: KURUM HESABIYLA GİRİŞ ürünün kendi parola
-- deposunun yerine geçmez, YANINA gelir.
--
-- 1) `KimlikSaglayici` — OIDC yapılandırması. SIR DEĞERİ YOK: istemci
--    sırrı yalnız `istemciSirriReferansi` ile taşınır (`env:` ·
--    `dosya:` · `vault:`). Uçlar ELLE girilir; keşif belgesini çekmek bir
--    ağ çağrısıdır ve yapılandırma anında yapılmaz. `bagli` ve `aktif`
--    ayrı alanlardır ve ikisi de VARSAYILAN OLARAK KAPALI: bağlanmamış
--    bir sağlayıcı giriş ekranında görünmez ve "bağlı değil" der.
--
-- 2) `KimlikBagi` — IdP'deki `sub` ile üründeki kullanıcının bağı.
--    E-POSTA İLE EŞLEŞTİRME YOK: e-posta değişir, yeniden atanır ve
--    devredilir; `sub` sağlayıcı içinde kalıcıdır. E-postayla eşleştiren
--    bir ürün, e-postası devralınan hesabı başkasının kimliğine düşürür.
--    `jitAcik` VARSAYILAN KAPALI olduğu için tanınmayan bir `sub`
--    REDDEDİLİR ve kullanıcı AÇILMAZ.
--
-- 3-4) `MfaKaydi` + `MfaKurtarmaKodu` — TOTP. TOTP paylaşılan sır ister;
--    doğrulama matematiği bunu zorunlu kılar. Ürünün "sır değeri
--    saklanmaz" kuralı ZARFLA korunur: `sirZarfi` AES-256-GCM şifreli
--    gövdedir ve ŞİFRELEME ANAHTARI VERİTABANINDA YOKTUR — anahtar bir
--    sır referansıyla dışarıdan çözülür (`MFA_ANAHTAR_REFERANSI`).
--    Kurtarma kodunun kendisi de saklanmaz, scrypt ÖZETİ saklanır.
--    `dogrulandi` varsayılan false: insan ilk kodu doğrulayana kadar
--    kayıt kurulu sayılmaz, yoksa kullanıcı kendi hesabından kilitlenirdi.
--
-- 5) `OturumPolitikasi` — 12 saat mutlak / 2 saat atıl varsayılanları
--    DEĞİŞMEDİ; gerekçesi `lib/auth.ts` başlığında duruyor. Kayıt YOKSA
--    varsayılan uygulanır ("politika yok" ile "politika sıfır" ayrı şey).
--    Atıl süre DAKİKA tutulur: çeyrek saat çözünürlüğü tam sayı saatte
--    temsil edilemez ve kesirli saat ekranda da kodda da yuvarlama
--    hatası üretirdi.
--
-- Bu göç HİÇBİR SATIR YAZMAZ: kurum hesabıyla giriş, bir insan bir
-- sağlayıcı tanımlayıp "bağla" diyene kadar YOKTUR.

-- CreateTable
CREATE TABLE "KimlikSaglayici" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KimlikBagi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saglayiciId" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "konu" TEXT NOT NULL,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonGiris" DATETIME,
    CONSTRAINT "KimlikBagi_saglayiciId_fkey" FOREIGN KEY ("saglayiciId") REFERENCES "KimlikSaglayici" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KimlikBagi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MfaKaydi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kullaniciId" TEXT NOT NULL,
    "tur" TEXT NOT NULL DEFAULT 'totp',
    "sirZarfi" TEXT NOT NULL,
    "dogrulandi" BOOLEAN NOT NULL DEFAULT false,
    "sonAdim" INTEGER,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonKullanim" DATETIME,
    CONSTRAINT "MfaKaydi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MfaKurtarmaKodu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kayitId" TEXT NOT NULL,
    "kodHash" TEXT NOT NULL,
    "kullanildi" DATETIME,
    CONSTRAINT "MfaKurtarmaKodu_kayitId_fkey" FOREIGN KEY ("kayitId") REFERENCES "MfaKaydi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OturumPolitikasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kiraci" TEXT NOT NULL DEFAULT 'varsayilan',
    "mutlakSaat" INTEGER NOT NULL DEFAULT 12,
    "atilDakika" INTEGER NOT NULL DEFAULT 120,
    "mfaZorunlu" BOOLEAN NOT NULL DEFAULT false,
    "guncellendi" DATETIME NOT NULL,
    "guncelleyenId" TEXT
);

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

