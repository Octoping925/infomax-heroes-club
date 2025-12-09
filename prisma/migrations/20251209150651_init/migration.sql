-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('LUNCH', 'DINNER');

-- CreateEnum
CREATE TYPE "HeroRole" AS ENUM ('MAIN_TANK', 'OFFLANER', 'MAIN_DEALER', 'SUB_DEALER', 'HEALER');

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "nickname" TEXT NOT NULL,
    "battletag" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hero" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" "HeroRole",
    "universe" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Hero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "matchType" "MatchType" NOT NULL,
    "maxGames" INTEGER NOT NULL,
    "targetWins" INTEGER NOT NULL,
    "isDraw" BOOLEAN NOT NULL DEFAULT false,
    "team1Score" INTEGER NOT NULL DEFAULT 0,
    "team2Score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchTeam" (
    "matchId" INTEGER NOT NULL,
    "teamNo" INTEGER NOT NULL,
    "leaderId" INTEGER NOT NULL,

    CONSTRAINT "MatchTeam_pkey" PRIMARY KEY ("matchId","teamNo")
);

-- CreateTable
CREATE TABLE "MatchTeamMember" (
    "matchId" INTEGER NOT NULL,
    "teamNo" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,

    CONSTRAINT "MatchTeamMember_pkey" PRIMARY KEY ("matchId","teamNo","playerId")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "gameNo" INTEGER NOT NULL,
    "mapName" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "isDraw" BOOLEAN NOT NULL DEFAULT false,
    "winnerTeamNo" INTEGER,
    "team1Kills" INTEGER,
    "team2Kills" INTEGER,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlayerStats" (
    "gameId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "teamNo" INTEGER NOT NULL,
    "heroId" INTEGER,
    "isWin" BOOLEAN NOT NULL,
    "kills" INTEGER,
    "deaths" INTEGER,
    "takedowns" INTEGER,
    "damageDone" INTEGER,
    "damageTaken" INTEGER,
    "healingDone" INTEGER,
    "note" TEXT,

    CONSTRAINT "GamePlayerStats_pkey" PRIMARY KEY ("gameId","playerId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_nickname_key" ON "Player"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "Hero_name_key" ON "Hero"("name");

-- CreateIndex
CREATE INDEX "Match_matchType_startedAt_idx" ON "Match"("matchType", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "Game_matchId_idx" ON "Game"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_matchId_gameNo_key" ON "Game"("matchId", "gameNo");

-- CreateIndex
CREATE INDEX "GamePlayerStats_playerId_idx" ON "GamePlayerStats"("playerId");

-- CreateIndex
CREATE INDEX "GamePlayerStats_heroId_idx" ON "GamePlayerStats"("heroId");

-- CreateIndex
CREATE INDEX "GamePlayerStats_playerId_heroId_idx" ON "GamePlayerStats"("playerId", "heroId");

-- AddForeignKey
ALTER TABLE "MatchTeam" ADD CONSTRAINT "MatchTeam_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTeam" ADD CONSTRAINT "MatchTeam_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTeamMember" ADD CONSTRAINT "MatchTeamMember_matchId_teamNo_fkey" FOREIGN KEY ("matchId", "teamNo") REFERENCES "MatchTeam"("matchId", "teamNo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTeamMember" ADD CONSTRAINT "MatchTeamMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayerStats" ADD CONSTRAINT "GamePlayerStats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayerStats" ADD CONSTRAINT "GamePlayerStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayerStats" ADD CONSTRAINT "GamePlayerStats_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero"("id") ON DELETE SET NULL ON UPDATE CASCADE;
