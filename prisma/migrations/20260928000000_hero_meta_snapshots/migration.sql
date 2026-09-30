CREATE TABLE "hero_meta_snapshots" (
  "key" TEXT NOT NULL,
  "stats" JSONB,
  "fetchedAt" TIMESTAMP(3),
  "jobPath" TEXT,
  "nextPollAt" TIMESTAMP(3),
  "leaseUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "hero_meta_snapshots_pkey" PRIMARY KEY ("key")
);
