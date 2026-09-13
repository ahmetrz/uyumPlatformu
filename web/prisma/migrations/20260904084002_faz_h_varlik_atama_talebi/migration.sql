-- CreateTable
CREATE TABLE "VarlikAtamaTalebi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varlikId" TEXT NOT NULL,
    "atananId" TEXT NOT NULL,
    "atayanId" TEXT NOT NULL,
    "oncekiSahipId" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'bekliyor',
    "not" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonTarih" DATETIME NOT NULL,
    "cevapZamani" DATETIME,
    "cevapNotu" TEXT,
    "iptalZamani" DATETIME,
    "iptalEdenId" TEXT,
    "uyarildi" BOOLEAN NOT NULL DEFAULT false,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "VarlikAtamaTalebi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VarlikAtamaTalebi_atananId_fkey" FOREIGN KEY ("atananId") REFERENCES "Kullanici" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VarlikAtamaTalebi_atayanId_fkey" FOREIGN KEY ("atayanId") REFERENCES "Kullanici" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VarlikAtamaTalebi_oncekiSahipId_fkey" FOREIGN KEY ("oncekiSahipId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VarlikAtamaTalebi_iptalEdenId_fkey" FOREIGN KEY ("iptalEdenId") REFERENCES "Kullanici" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VarlikAtamaTalebi_atananId_durum_idx" ON "VarlikAtamaTalebi"("atananId", "durum");

-- CreateIndex
CREATE INDEX "VarlikAtamaTalebi_varlikId_durum_idx" ON "VarlikAtamaTalebi"("varlikId", "durum");

-- CreateIndex
CREATE INDEX "VarlikAtamaTalebi_durum_sonTarih_idx" ON "VarlikAtamaTalebi"("durum", "sonTarih");
