-- Faz 5 operasyonel ekranların ihtiyaç duyduğu ek alanlar.
-- Tümü nullable: mevcut satırlar etkilenmez, veri kaybı yok.

-- O12 · Ağ / OT topolojisi: geçidin conduit kuralına göre son doğrulama tarihi.
ALTER TABLE "AgGeciti" ADD COLUMN "sonDogrulama" DATETIME;

-- O16 · Tedarikçiler: uzaktan erişimin yöntemi ve oturum kaydı durumu.
-- oturumKaydiVar NULL = bilinmiyor; ekran bunu "izlenmiyor" ile karıştırmaz.
ALTER TABLE "Tedarikci" ADD COLUMN "uzaktanErisimYontemi" TEXT;
ALTER TABLE "Tedarikci" ADD COLUMN "oturumKaydiVar" BOOLEAN;

-- O14 · Yedekleme & kurtarma: RPO/RTO ve kapsam dışı bırakılan sistemler.
ALTER TABLE "YedeklemePolitikasi" ADD COLUMN "rpoSaat" INTEGER;
ALTER TABLE "YedeklemePolitikasi" ADD COLUMN "rtoSaat" INTEGER;
ALTER TABLE "YedeklemePolitikasi" ADD COLUMN "haricTutulan" TEXT;
