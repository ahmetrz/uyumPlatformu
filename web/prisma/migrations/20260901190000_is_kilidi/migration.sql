-- CreateTable
CREATE TABLE "IsKilidi" (
    "ad" TEXT NOT NULL PRIMARY KEY,
    "sahip" TEXT NOT NULL,
    "alindi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gecerlilik" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "IsKilidi_gecerlilik_idx" ON "IsKilidi"("gecerlilik");

