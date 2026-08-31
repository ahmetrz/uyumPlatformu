-- Kapsam ve idempotency kısıtları.
--
-- Dört değişiklik, dördü de VERİTABANI SEVİYESİNDE bir garantiyi
-- kod seviyesindeki bir kontrolün yerine koyar:
--
-- 1. Zafiyet.kaynakRef tekil olur. Aynı CVE iki farklı kaynaktan gelirse
--    tek satır kalır. NULL kalan (elle girilmiş, referanssız) kayıtlar
--    SQLite semantiği gereği kısıtın dışındadır ve bu kasıtlıdır:
--    referansı olmayan iki kaydın aynı olduğunu iddia edemeyiz.
--
-- 2. KesifKaydi.tesisId eklenir. Bir keşif kaydının santrali bugüne kadar
--    ancak EŞLEŞTİKTEN sonra biliniyordu; eşleşmemiş kayıt kapsam
--    filtresinden muaf kalıyordu. Gözlemin beyan ettiği tesis kodu ya da
--    connector yapılandırması artık kayda yazılır ve kapsam daraltması
--    eşleşmeden önce de işler. null = santral BİLİNMİYOR.
--
-- 3+4. KonfigurasyonYedegi ve TedarikciErisimOturumu kaynakKayitId alır ve
--    (kaynakSistem, kaynakKayitId) tekil olur. Idempotency bugüne kadar
--    VeriKokeni tablosunda arama yaparak sağlanıyordu; eşzamanlı iki içe
--    aktarım ikisi de "köken yok" görüp aynı kaydı iki kez yazabilirdi.
--    Kısıt artık veritabanında.
--
-- Üç tablo da boştur (0 satır) — yeniden kurmak güvenlidir; SQLite
-- ALTER COLUMN desteklemez. Zafiyet'te 10 satır vardır ve kaynakRef
-- değerleri 10/10 tekildir, NULL yoktur: kısıt mevcut veriyi reddetmez.

CREATE UNIQUE INDEX "Zafiyet_kaynakRef_key" ON "Zafiyet"("kaynakRef");

CREATE INDEX "ApiIstegi_anahtarId_zaman_idx" ON "ApiIstegi"("anahtarId", "zaman");

-- ── KesifKaydi ────────────────────────────────────────────────────────
DROP TABLE "KesifKaydi";

CREATE TABLE "KesifKaydi" (
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
  "inceleyenId" TEXT,
  "incelemeZamani" DATETIME,
  "incelemeNotu" TEXT,
  "ilkGorulme" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sonGorulme" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KesifKaydi_connectorId_fkey" FOREIGN KEY ("connectorId")
    REFERENCES "Connector"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "KesifKaydi_tesisId_fkey" FOREIGN KEY ("tesisId")
    REFERENCES "Tesis"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "KesifKaydi_eslesenVarlikId_fkey" FOREIGN KEY ("eslesenVarlikId")
    REFERENCES "Varlik"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "KesifKaydi_inceleyenId_fkey" FOREIGN KEY ("inceleyenId")
    REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "KesifKaydi_kaynak_kaynakKayitId_key" ON "KesifKaydi"("kaynak", "kaynakKayitId");
CREATE INDEX "KesifKaydi_durum_sonGorulme_idx" ON "KesifKaydi"("durum", "sonGorulme");
CREATE INDEX "KesifKaydi_tesisId_durum_idx" ON "KesifKaydi"("tesisId", "durum");

-- ── KonfigurasyonYedegi ───────────────────────────────────────────────
DROP TABLE "KonfigurasyonYedegi";

CREATE TABLE "KonfigurasyonYedegi" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "varlikId" TEXT NOT NULL,
  "kaynakSistem" TEXT NOT NULL,
  "kaynakKayitId" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "KonfigurasyonYedegi_kaynakSistem_kaynakKayitId_key"
  ON "KonfigurasyonYedegi"("kaynakSistem", "kaynakKayitId");
CREATE INDEX "KonfigurasyonYedegi_varlikId_yedekZamani_idx"
  ON "KonfigurasyonYedegi"("varlikId", "yedekZamani");

-- ── TedarikciErisimOturumu ────────────────────────────────────────────
DROP TABLE "TedarikciErisimOturumu";

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
  "kaynakKayitId" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "TedarikciErisimOturumu_kaynakSistem_kaynakKayitId_key"
  ON "TedarikciErisimOturumu"("kaynakSistem", "kaynakKayitId");
CREATE INDEX "TedarikciErisimOturumu_tedarikciId_baslangic_idx"
  ON "TedarikciErisimOturumu"("tedarikciId", "baslangic");
