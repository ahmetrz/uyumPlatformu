-- P4 · 2.1 — SÖZLÜK VE ÖZNİTELİK ŞEMASINDA `aktif` BAYRAĞI
--
-- NİÇİN: paket yükseltmesi artık beyan etmediği sözlük ve öznitelik
-- satırını bugüne kadar yalnız RAPORLUYORDU (`artik`): satır yerinde
-- kalıyor, ekran eski sözcüğü söylemeye ve pasif özniteliği çizmeye devam
-- ediyordu. Silmek yasak (R-C: paket işlemi müşteri verisini silemez —
-- öznitelik satırının altında kiracının değerleri olabilir). Üçüncü yol
-- aktif bayrağıdır: tür ve yükümlülükte zaten var, iki tablo daha alır.
-- Okuyucular yalnız aktif satırı görür (`lib/dil/sozlukOku.ts`,
-- `lib/kapsam/rol.ts`, portföy, Tesis 360, profil kaydı).
--
-- EKLEMELİ GÖÇ, ELLE YAZILDI: `ALTER TABLE … ADD COLUMN` sabit
-- varsayılanlı — tablo yerinde kalır, indeks ve tetikleyici korunur
-- (`20260909090000_p4_icerik_paketi` gerekçesiyle aynı). Mevcut her
-- satır aktif olur: paketten gelmemiş satırın davranışı değişmez.
-- Sonuç `kapi:sema-sapmasi` ile şemaya karşı ölçülür.

ALTER TABLE "SektorSozlugu" ADD COLUMN "aktif" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SektorOznitelikSemasi" ADD COLUMN "aktif" BOOLEAN NOT NULL DEFAULT true;
