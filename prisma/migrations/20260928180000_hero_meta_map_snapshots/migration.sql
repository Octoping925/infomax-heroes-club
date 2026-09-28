ALTER TABLE "hero_meta_snapshots"
ADD COLUMN "mapStats" JSONB,
ADD COLUMN "mapPatch" TEXT,
ADD COLUMN "mapFetchedAt" TIMESTAMP(3),
ADD COLUMN "mapJobPath" TEXT,
ADD COLUMN "mapPendingPatch" TEXT,
ADD COLUMN "mapNextPollAt" TIMESTAMP(3),
ADD COLUMN "mapLastError" TEXT;
