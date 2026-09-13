-- VeriKokeni.kaynakKayitId zorunlu hâle getirilir.
--
-- Gerekçe: alan nullable iken bileşik tekillik kısıtı iş görmüyordu —
-- SQLite'ta NULL'lar birbirinden farklı sayılır, dolayısıyla aynı kayıt
-- her senkronizasyonda yeni bir köken satırı açardı ve idempotency
-- garantisi diye bir şey kalmazdı.
--
-- Tablo bir önceki migration'da oluşturuldu ve henüz veri almadı; bu yüzden
-- yeniden kurmak güvenlidir. SQLite ALTER COLUMN desteklemez.

DROP TABLE "VeriKokeni";

CREATE TABLE "VeriKokeni" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "varlikTipi" TEXT NOT NULL,
  "varlikId" TEXT NOT NULL,
  "kokenTipi" TEXT NOT NULL,
  "kaynakSistem" TEXT NOT NULL,
  "kaynakKayitId" TEXT NOT NULL,
  "connectorId" TEXT,
  "kosuId" TEXT,
  "toplanma" DATETIME,
  "aktarim" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "guven" REAL,
  "dogrulamaDurumu" TEXT NOT NULL DEFAULT 'dogrulanmadi',
  "dogrulayanId" TEXT,
  "dogrulamaZamani" DATETIME,
  CONSTRAINT "VeriKokeni_dogrulayanId_fkey" FOREIGN KEY ("dogrulayanId")
    REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VeriKokeni_varlikTipi_varlikId_kaynakSistem_kaynakKayitId_key"
  ON "VeriKokeni"("varlikTipi", "varlikId", "kaynakSistem", "kaynakKayitId");
CREATE INDEX "VeriKokeni_varlikTipi_varlikId_idx" ON "VeriKokeni"("varlikTipi", "varlikId");
CREATE INDEX "VeriKokeni_kokenTipi_dogrulamaDurumu_idx"
  ON "VeriKokeni"("kokenTipi", "dogrulamaDurumu");
