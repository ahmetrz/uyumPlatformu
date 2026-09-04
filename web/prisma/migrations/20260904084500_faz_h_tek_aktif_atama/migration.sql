-- Aynı varlık için AYNI ANDA birden fazla bekleyen atama talebi olamaz.
--
-- Kural sunucu eyleminde de sınanır, ama tek başına yeterli değildir:
-- iki istek aynı anda gelirse ikisi de "bekleyen yok" görür ve iki talep
-- açılır. Kişi iki ayrı bildirim alır, biri kabul biri reddederse
-- sahiplik hangi cevaba göre belirlenecek belli olmaz.
--
-- Bu yüzden kısıt VERİTABANINDA durur. Kısmi indeks yalnız `bekliyor`
-- satırlarını kapsar: kapanmış talepler geçmiş kaydıdır ve bir varlığın
-- geçmişinde onlarca reddedilmiş talep olabilir.
CREATE UNIQUE INDEX "VarlikAtamaTalebi_tek_aktif"
  ON "VarlikAtamaTalebi"("varlikId")
  WHERE "durum" = 'bekliyor';
