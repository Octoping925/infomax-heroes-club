-- AlterTable
ALTER TABLE "games" ADD COLUMN "sourceReplayHash" TEXT;

-- AlterTable
ALTER TABLE "matches" ADD COLUMN "replayImportFingerprint" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "games_sourceReplayHash_key" ON "games"("sourceReplayHash");
