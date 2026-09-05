-- CreateTable
CREATE TABLE "VarlikDurusGozlemi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varlikId" TEXT NOT NULL,
    "kaynakSistem" TEXT NOT NULL,
    "kaynakKayitId" TEXT NOT NULL,
    "connectorId" TEXT,
    "kosuId" TEXT,
    "hostname" TEXT,
    "ipAdresi" TEXT,
    "macAdresi" TEXT,
    "uretici" TEXT,
    "model" TEXT,
    "isletimSistemi" TEXT,
    "osSurumu" TEXT,
    "osYapisi" TEXT,
    "yamaSeviyesi" TEXT,
    "sonYamaTarihi" DATETIME,
    "firmware" TEXT,
    "kaynakZamani" DATETIME,
    "alinma" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guven" REAL,
    "ham" TEXT,
    "guncellendi" DATETIME NOT NULL,
    CONSTRAINT "VarlikDurusGozlemi_varlikId_fkey" FOREIGN KEY ("varlikId") REFERENCES "Varlik" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VarlikDurusGozlemi_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VarlikDurusGozlemi_kaynakSistem_kaynakZamani_idx" ON "VarlikDurusGozlemi"("kaynakSistem", "kaynakZamani");

-- CreateIndex
CREATE UNIQUE INDEX "VarlikDurusGozlemi_varlikId_kaynakSistem_key" ON "VarlikDurusGozlemi"("varlikId", "kaynakSistem");
