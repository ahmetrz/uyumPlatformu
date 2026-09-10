-- R10+ · TAKVİM TETİKLİ YÜKÜMLÜLÜK
--
-- Bu göç İKİ şey yapar ve ikisi de aynı kusurdan doğdu.
--
-- 1) `BildirimYukumlulugu`ne TETİKLEYİCİ TÜRÜ eklenir. Ölçüldü (#48):
--    EPDK Yönetmeliği md. 10/2, 10/3 ve 10/4 üç raporlama süresi veriyor
--    ve üçü de OLAYDAN değil TAKVİMDEN doğuyor. Model yalnız olay tetikli
--    olduğu için bu yükümlülükler ürüne HİÇ giremiyordu; olay alanına
--    yazmak ise biçimi doğru bir ANLAM EŞLEME HATASI olurdu (R-D):
--    `asgariSiddet` bir takvim yükümlülüğü için anlamsızdır ve hiçbir
--    kapı bunu göremez. Varsayılan `olay`: mevcut satırların anlamı
--    DEĞİŞMEZ.
--
-- 2) `BildirimDonemi` tablosu açılır. Olay tetiklide kayıt bir OLAYDAN
--    doğar, takvim tetiklide bir DÖNEMDEN; ikisi ayrı tablodur çünkü ayrı
--    sorular sorarlar ("bu olay bildirildi mi" · "bu dönemin raporu
--    verildi mi"). Aynı tabloya sıkıştırmak `olayId`yi nullable yapıp iki
--    gerçeği tek satırda tutmak olurdu.
--
-- NULL ≠ 0 (üç alanda birden): `donem` boşsa periyot mevzuatta
-- belirlenmedi ve dönem AÇILMAZ; `teslimGun` boşsa son tarih YOKTUR ve
-- sayaç işlemez; `donemBaslangici` boşsa takvim yılı VARSAYILIR ve bu
-- varsayım ekrana kadar beyan edilir. Üçünde de sıfır yazmak, mevzuatın
-- söylemediğini ürünün söylemesi olurdu.

ALTER TABLE "BildirimYukumlulugu" ADD COLUMN "tetikleyici" TEXT NOT NULL DEFAULT 'olay';
ALTER TABLE "BildirimYukumlulugu" ADD COLUMN "donem" TEXT;
ALTER TABLE "BildirimYukumlulugu" ADD COLUMN "donemBaslangici" TEXT;
ALTER TABLE "BildirimYukumlulugu" ADD COLUMN "teslimGun" INTEGER;

CREATE TABLE "BildirimDonemi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yukumlulukId" TEXT NOT NULL,
    "donemEtiketi" TEXT NOT NULL,
    "baslangic" DATETIME NOT NULL,
    "bitis" DATETIME NOT NULL,
    "sonTarih" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "referansNo" TEXT,
    "verenId" TEXT,
    "verilmeZamani" DATETIME,
    "teyitZamani" DATETIME,
    "kanitId" TEXT,
    "uygulanmazGerekcesi" TEXT,
    "acildi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "BildirimDonemi_yukumlulukId_fkey" FOREIGN KEY ("yukumlulukId") REFERENCES "BildirimYukumlulugu" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BildirimDonemi_verenId_fkey" FOREIGN KEY ("verenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BildirimDonemi_kanitId_fkey" FOREIGN KEY ("kanitId") REFERENCES "Kanit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Aynı yükümlülüğün aynı dönemi İKİ KEZ açılmaz: motor her koşuda
-- yeniden bakar ve idempotent olması bu kısıta bağlıdır.
CREATE UNIQUE INDEX "BildirimDonemi_yukumlulukId_donemEtiketi_key" ON "BildirimDonemi"("yukumlulukId", "donemEtiketi");
CREATE INDEX "BildirimDonemi_durum_idx" ON "BildirimDonemi"("durum");
CREATE INDEX "BildirimDonemi_sonTarih_idx" ON "BildirimDonemi"("sonTarih");
