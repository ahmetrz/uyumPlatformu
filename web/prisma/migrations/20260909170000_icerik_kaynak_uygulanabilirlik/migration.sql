-- İÇERİK: madde kaynağına erişim tarihi + paket beyanlı uygulanabilirlik kuralının kökeni
--
-- NİÇİN: TR-ENERJI'ye resmî içerik girerken her maddenin kaynağı (URL) ve
-- kaynağa erişim tarihi maddenin yanında durmalı (`Madde.maddeKaynakUrl`
-- vardı, erişim tarihi yoktu). Çerçevenin hangi kapsam öğesi TÜRÜNE
-- asıldığını paket beyan eder; kurucu bunu `UygulanabilirlikKurali`
-- olarak yazar ve satırın kökenini bilmek zorundadır (yükseltme yeniler,
-- kaldırma pasifler, kiracı kuralına dokunmaz).
--
-- YALNIZ ADD COLUMN — RedefineTables yok; göç zinciri kapısı
-- (`kapi:goc-zinciri`) boş veritabanında şemayla farkı sıfır ölçer.
ALTER TABLE "Madde" ADD COLUMN "kaynakErisimTarihi" DATETIME;
ALTER TABLE "UygulanabilirlikKurali" ADD COLUMN "koken" TEXT NOT NULL DEFAULT 'kiraci';
ALTER TABLE "UygulanabilirlikKurali" ADD COLUMN "paketSurumId" TEXT;
