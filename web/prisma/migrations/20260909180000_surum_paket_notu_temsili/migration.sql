-- Çerçeve sürümüne paket notu ve TEMSİLÎ bayrağı
--
-- NİÇİN: paket çerçeve kimliğinde "madde metni TEMSİLÎDİR — <belge> örnek
-- alınarak yazılmıştır" diye beyan ediyordu, ama bu beyan kurulumda hiçbir
-- yere yazılmıyordu: veritabanında kurgusal demo metni gerçek mevzuattan
-- ayırt edilemiyordu (bağımsız inceleme, PR #43 tur 2). Rozet henüz yok;
-- veriyi indirmek onun ön koşulu.
--
-- YALNIZ ADD COLUMN — RedefineTables yok.
ALTER TABLE "FrameworkSurumu" ADD COLUMN "paketNotu" TEXT;
ALTER TABLE "FrameworkSurumu" ADD COLUMN "temsili" BOOLEAN NOT NULL DEFAULT false;
