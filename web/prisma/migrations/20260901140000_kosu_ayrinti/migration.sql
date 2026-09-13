-- EntegrasyonKosusu'na hata OLMAYAN açıklama alanı.
--
-- Gerekçe: "hangi kimlik bilgisi eksik", "kaynak bağlı değil", "kaç kayıt
-- hangi sebeple reddedildi" gibi bilgiler `hata` alanına yazılıyordu.
-- Bu, bekleyen bir kurulum adımı ile gerçek bir başarısızlığı aynı yere
-- koyuyor ve sağlık ekranını yanlış renklendiriyordu.
ALTER TABLE "EntegrasyonKosusu" ADD COLUMN "ayrinti" TEXT;
