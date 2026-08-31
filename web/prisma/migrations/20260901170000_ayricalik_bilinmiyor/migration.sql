-- KimlikHesabi.ayricalikli üç değerli olur: true | false | null(BİLİNMİYOR).
--
-- Alan NOT NULL DEFAULT false idi. Dizin/PAM gözlemi ayrıcalık bilgisi
-- taşımadığında API ucu alana DOKUNMUYORDU — ama bu yalnız GÜNCELLEMEDE
-- işe yarıyordu: yeni bir hesap açılırken varsayılan devreye giriyor ve
-- ölçülmemiş bir hesap sessizce "ayrıcalıklı değil" olarak kaydediliyordu.
-- Sonuç: ayrıcalıklı hesap sayımı olduğundan düşük görünüyordu, yani
-- "bilinmiyor" sıfır sayılıyordu.
--
-- Mevcut 71 satır değerini AYNEN korur (23 true / 48 false); bunlar seed
-- tarafından açıkça atanmıştır, null'a çevrilmez. Bundan sonrası için
-- ölçülmemiş değer null kalır.
--
-- SQLite ALTER COLUMN desteklemez; betik `prisma migrate diff` çıktısıdır
-- ve INSERT ... SELECT ile veriyi taşır.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KimlikHesabi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hesapAdi" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "kullaniciId" TEXT,
    "tesisId" TEXT,
    "kaynakSistem" TEXT,
    "ayricalikli" BOOLEAN,
    "parolaRotasyon" DATETIME,
    "sonKullanim" DATETIME,
    "durum" TEXT NOT NULL DEFAULT 'aktif',
    CONSTRAINT "KimlikHesabi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KimlikHesabi_tesisId_fkey" FOREIGN KEY ("tesisId") REFERENCES "Tesis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_KimlikHesabi" ("ayricalikli", "durum", "hesapAdi", "id", "kaynakSistem", "kullaniciId", "parolaRotasyon", "sonKullanim", "tesisId", "tip") SELECT "ayricalikli", "durum", "hesapAdi", "id", "kaynakSistem", "kullaniciId", "parolaRotasyon", "sonKullanim", "tesisId", "tip" FROM "KimlikHesabi";
DROP TABLE "KimlikHesabi";
ALTER TABLE "new_KimlikHesabi" RENAME TO "KimlikHesabi";
CREATE UNIQUE INDEX "KimlikHesabi_hesapAdi_key" ON "KimlikHesabi"("hesapAdi");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

