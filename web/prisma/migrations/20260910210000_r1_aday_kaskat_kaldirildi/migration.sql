-- R-C · ADAY KASKATLA SİLİNMEZ
--
-- `MevzuatDegisiklikAdayi` bir İNSAN KARARI taşır (`durum`,
-- `kararVerenId`, `kararZamani`, `gerekce`). Kaynağın FK'si `CASCADE`
-- kurulmuştu: kaynak silinseydi karara bağlanmış adaylar da giderdi.
-- Bugün kaynak silen bir eylem YOK, ama korumasız bir mayındı ve
-- bağımsız inceleme (PR #50 tur 1) onu bu hâliyle yakaladı — #41'de
-- `madde.deleteMany` ile aynı sınıf.
--
-- `RESTRICT`: adayı olan kaynağın silinmesini VERİTABANI reddeder.
-- "Kaldırma bir durum değişikliğidir, silme yok" cümlesi böylece bir
-- kural olmaktan çıkıp KAPI olur. Tarama geçmişi (`MevzuatTaramasi`)
-- kaskat kalır: o makine çıktısıdır, insan kararı taşımaz.
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MevzuatDegisiklikAdayi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kaynakId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "yayinTarihi" DATETIME,
    "ozet" TEXT,
    "bulundu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durum" TEXT NOT NULL DEFAULT 'yeni',
    "kararVerenId" TEXT,
    "kararZamani" DATETIME,
    "gerekce" TEXT,
    "surumId" TEXT,
    CONSTRAINT "MevzuatDegisiklikAdayi_kaynakId_fkey" FOREIGN KEY ("kaynakId") REFERENCES "MevzuatKaynagi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MevzuatDegisiklikAdayi" ("baslik", "bulundu", "durum", "gerekce", "id", "kararVerenId", "kararZamani", "kaynakId", "ozet", "surumId", "url", "yayinTarihi") SELECT "baslik", "bulundu", "durum", "gerekce", "id", "kararVerenId", "kararZamani", "kaynakId", "ozet", "surumId", "url", "yayinTarihi" FROM "MevzuatDegisiklikAdayi";
DROP TABLE "MevzuatDegisiklikAdayi";
ALTER TABLE "new_MevzuatDegisiklikAdayi" RENAME TO "MevzuatDegisiklikAdayi";
CREATE INDEX "MevzuatDegisiklikAdayi_durum_bulundu_idx" ON "MevzuatDegisiklikAdayi"("durum", "bulundu");
CREATE UNIQUE INDEX "MevzuatDegisiklikAdayi_kaynakId_url_key" ON "MevzuatDegisiklikAdayi"("kaynakId", "url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

