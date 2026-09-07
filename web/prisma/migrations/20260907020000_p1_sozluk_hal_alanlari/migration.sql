-- P1 · Terim sözlüğüne bulunma ve yönelme hâlleri (URN-ALN-004)
--
-- Türkçe ek, sözcüğün son sesine göre değişir; ekran cümlesi "bu tesiste"
-- ya da "bu tesise" diyor. Bu hâlleri dize birleştirmeyle üretmek ilk
-- sektörde çalışır, ikincisinde sessizce bozulur. Hâller ALAN olur.
--
-- Alanlar nullable: eksik hâl çekirdek karşılığına düşer, ekran boş kalmaz.


-- AlterTable
ALTER TABLE "SektorSozlugu" ADD COLUMN "bulunma" TEXT;
ALTER TABLE "SektorSozlugu" ADD COLUMN "yonelme" TEXT;

