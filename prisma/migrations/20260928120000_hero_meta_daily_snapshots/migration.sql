ALTER TABLE "hero_meta_snapshots"
ADD COLUMN "patch" TEXT,
ADD COLUMN "pendingPatch" TEXT,
ADD COLUMN "lastRunDate" TEXT,
ADD COLUMN "lastError" TEXT;
