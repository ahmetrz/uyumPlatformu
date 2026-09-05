-- Kolon sırası normalizasyonu — davranış değişikliği YOKTUR.
--
-- `EntegrasyonKosusu` ve `Olay` tabloları elle yazılmış migration'larda
-- ALTER TABLE ADD COLUMN ile genişletilmişti; SQLite yeni kolonu sona
-- ekler, Prisma ise şemadaki sırayı bekler. Kolon adları, tipleri,
-- NULL'lanabilirlikleri ve varsayılanları birebir aynı olmasına rağmen
-- `prisma migrate diff` bu iki tabloyu sürekli "sapma" olarak
-- raporluyordu. Kalıcı yalancı pozitif, gerçek bir sapmayı görmemize
-- engel olur — bu yüzden sırayı şemaya eşitliyoruz.
--
-- Her iki tablo da bu noktada boştur; INSERT ... SELECT yine de yazılıdır
-- ki migration veri bulunan bir kurulumda da güvenle koşsun.
-- Aşağıdaki betik `prisma migrate diff` tarafından üretilmiştir.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EntegrasyonKosusu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynak" TEXT NOT NULL,
    "baslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'calisiyor',
    "kayitSayisi" INTEGER NOT NULL DEFAULT 0,
    "guvenEtiketi" TEXT NOT NULL DEFAULT 'manuel',
    "hata" TEXT,
    "ayrinti" TEXT,
    "connectorId" TEXT,
    "tetikleyen" TEXT NOT NULL DEFAULT 'manuel',
    "alinan" INTEGER NOT NULL DEFAULT 0,
    "kabulEdilen" INTEGER NOT NULL DEFAULT 0,
    "reddedilen" INTEGER NOT NULL DEFAULT 0,
    "yinelenen" INTEGER NOT NULL DEFAULT 0,
    "sureMs" INTEGER,
    "denemeNo" INTEGER NOT NULL DEFAULT 1,
    "imlecOnce" TEXT,
    "imlecSonra" TEXT,
    CONSTRAINT "EntegrasyonKosusu_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EntegrasyonKosusu" ("alinan", "ayrinti", "baslangic", "bitis", "connectorId", "denemeNo", "durum", "guvenEtiketi", "hata", "id", "imlecOnce", "imlecSonra", "kabulEdilen", "kayitSayisi", "kaynak", "reddedilen", "sureMs", "tetikleyen", "yinelenen") SELECT "alinan", "ayrinti", "baslangic", "bitis", "connectorId", "denemeNo", "durum", "guvenEtiketi", "hata", "id", "imlecOnce", "imlecSonra", "kabulEdilen", "kayitSayisi", "kaynak", "reddedilen", "sureMs", "tetikleyen", "yinelenen" FROM "EntegrasyonKosusu";
DROP TABLE "EntegrasyonKosusu";
ALTER TABLE "new_EntegrasyonKosusu" RENAME TO "EntegrasyonKosusu";
CREATE INDEX "EntegrasyonKosusu_connectorId_baslangic_idx" ON "EntegrasyonKosusu"("connectorId", "baslangic");
CREATE TABLE "new_Olay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'olay',
    "tesisId" TEXT,
    "siddet" TEXT NOT NULL DEFAULT 'orta',
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "baslangic" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cozum" DATETIME,
    "ozet" TEXT,
    "tespitKaynagi" TEXT,
    "uretimEtkisi" TEXT,
    "emniyetEtkisi" TEXT,
    "regulasyonEtkisi" TEXT,
    "siberEtki" TEXT,
    "kokNeden" TEXT,
    "sinirlama" TEXT,
    "kurtarma" TEXT,
    "ogrenilenler" TEXT,
    "bildirimGerekli" BOOLEAN,
    "bildirimTarihi" DATETIME,
    "etkiOnerisiJson" TEXT,
    "etkiDogrulayanId" TEXT,
    "etkiDogrulamaZamani" DATETIME,
    CONSTRAINT "Olay_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Olay_etkiDogrulayanId_fkey" FOREIGN KEY ("etkiDogrulayanId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Olay" ("baslangic", "baslik", "bildirimGerekli", "bildirimTarihi", "cozum", "durum", "emniyetEtkisi", "etkiDogrulamaZamani", "etkiDogrulayanId", "etkiOnerisiJson", "id", "kod", "kokNeden", "kurtarma", "ogrenilenler", "ozet", "regulasyonEtkisi", "siberEtki", "siddet", "sinirlama", "tesisId", "tespitKaynagi", "tip", "uretimEtkisi") SELECT "baslangic", "baslik", "bildirimGerekli", "bildirimTarihi", "cozum", "durum", "emniyetEtkisi", "etkiDogrulamaZamani", "etkiDogrulayanId", "etkiOnerisiJson", "id", "kod", "kokNeden", "kurtarma", "ogrenilenler", "ozet", "regulasyonEtkisi", "siberEtki", "siddet", "sinirlama", "tesisId", "tespitKaynagi", "tip", "uretimEtkisi" FROM "Olay";
DROP TABLE "Olay";
ALTER TABLE "new_Olay" RENAME TO "Olay";
CREATE UNIQUE INDEX "Olay_kod_key" ON "Olay"("kod");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

