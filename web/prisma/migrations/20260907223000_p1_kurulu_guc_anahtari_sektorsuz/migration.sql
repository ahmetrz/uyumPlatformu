-- P1 · §0.5 · Çekirdek anahtarda sektör birimi olmaz.
--
-- Öznitelik anahtarı `kuruluGucMw` bir ENERJİ BİRİMİ taşıyordu (MW).
-- Değerin birimi zaten satırın `birim` kolonunda duruyor ve sektöre göre
-- değişiyor (MW · m³/gün · ton/saat); anahtarın onu bir kez daha, üstelik
-- SABİT olarak söylemesi hem tekrar hem yanlıştı.
--
-- ÜÇ TABLO, ÜÇ AYRI GEREKÇE:
--
-- 1-2. `TesisOzellik` / `BirimOzellik` — anahtar bir KOD; satırın değeri,
--      birimi, kaynağı ve ölçüm zamanı olduğu gibi kalır.
--
-- 3.   `UygulanabilirlikKurali.kosulJson` — kurallar özniteliğe ADIYLA
--      atıf yapıyor (`{"alan":"kuruluGucMw",…}`). Bu satırlar
--      GÜNCELLENMEZSE motor aradığı özniteliği bulamaz ve kuralı
--      "bilinmiyor" diye değerlendirir: sessiz bir davranış değişikliği.
--      Bu yüzden atıflar da taşınır. Yalnız TAM anahtar eşleşmesi
--      değiştirilir (`"kuruluGucMw"`), serbest metin değil.
--
-- DENETİM İZİNE DOKUNULMAZ. `AktiviteKaydi` satırlarında eski anahtar
-- geçebilir; o kayıtlar YAZILDIKLARI GÜNÜ anlatır ve değişmez iz
-- kuralı gereği geçmişe dönük düzeltilmez.
UPDATE "TesisOzellik" SET "anahtar" = 'kuruluGuc' WHERE "anahtar" = 'kuruluGucMw';
UPDATE "BirimOzellik"  SET "anahtar" = 'kuruluGuc' WHERE "anahtar" = 'kuruluGucMw';
UPDATE "UygulanabilirlikKurali"
   SET "kosulJson" = REPLACE("kosulJson", '"kuruluGucMw"', '"kuruluGuc"')
 WHERE "kosulJson" LIKE '%"kuruluGucMw"%';
