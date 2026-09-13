-- Ölçülmüş eksik indeksler (docs/POSTGRES_READINESS.md §d, docs/PERFORMANS_TABANI.md §6).
-- Üçü A/B ölçümüyle gerekçelendirildi; AktiviteKaydi(zaman) ÖLÇÜLMEDİ —
-- gerekçesi denetim izinin hiç silinmemesi, yani tek yönlü büyümedir.
-- Ölçülmüş kazancı %9 olan Varlik(silindi) indeksi BİLEREK eklenmedi.

-- CreateIndex
-- Aktivite ekranı filtresiz `zaman desc` okur. ÖLÇÜLMEDİ (tablo ~22 satır).
CREATE INDEX "AktiviteKaydi_zaman_idx" ON "AktiviteKaydi"("zaman");

-- CreateIndex
-- Keşif kuyruğu: `KesifKaydi ORDER BY sonGorulme DESC LIMIT 500` — 58,5 ms → 1,9 ms.
CREATE INDEX "KesifKaydi_sonGorulme_idx" ON "KesifKaydi"("sonGorulme");

-- CreateIndex
-- Envanter: varlığın son keşif kaydı — 45,1 ms → 3,9 ms.
CREATE INDEX "KesifKaydi_eslesenVarlikId_sonGorulme_idx" ON "KesifKaydi"("eslesenVarlikId", "sonGorulme");

-- CreateIndex
-- Envanter: `VarlikZafiyeti WHERE varlikId IN (900)` — 21,4 ms → 6,6 ms.
CREATE INDEX "VarlikZafiyeti_varlikId_idx" ON "VarlikZafiyeti"("varlikId");
