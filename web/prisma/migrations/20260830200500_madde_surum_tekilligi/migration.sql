-- DropIndex
DROP INDEX "Madde_regulasyonId_kod_key";

-- CreateIndex
CREATE UNIQUE INDEX "Madde_regulasyonId_surumId_kod_key" ON "Madde"("regulasyonId", "surumId", "kod");

