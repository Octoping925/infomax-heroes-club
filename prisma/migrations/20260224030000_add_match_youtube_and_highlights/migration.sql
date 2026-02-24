ALTER TABLE "matches" ADD COLUMN "youtubeUrl" TEXT;

CREATE TABLE "match_highlights" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "seconds" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "match_highlights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "match_highlights_matchId_seconds_idx" ON "match_highlights"("matchId", "seconds");

ALTER TABLE "match_highlights"
ADD CONSTRAINT "match_highlights_matchId_fkey"
FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
