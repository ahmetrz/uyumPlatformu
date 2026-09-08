-- P1 · §0.5 · Çekirdek şemada sektör birimi olmaz.
--
-- `uretimKaybiMw` kolon adı bir ENERJİ BİRİMİ taşıyordu (MW). Miktarın
-- birimi artık `kayipBirim` kolonunda satırla birlikte duruyor
-- (20260907162014_etki_kayip_birimi); ad da sektörsüzleşiyor.
--
-- YALNIZ AD DEĞİŞİYOR: değerler, `null`lar ve `kayipBirim` eşleşmesi
-- olduğu gibi taşınıyor. Bir su kiracısının m³/gün kaydı `Mw` adlı bir
-- kolonda durmayacak.
ALTER TABLE "EtkiDegerlendirmesi" RENAME COLUMN "uretimKaybiMw" TO "uretimKaybi";
