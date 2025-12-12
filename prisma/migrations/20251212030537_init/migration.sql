-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('LUNCH', 'DINNER');

-- CreateEnum
CREATE TYPE "HeroRole" AS ENUM ('TANKER', 'BRUISER', 'RANGED_ASSASSIN', 'MELEE_ASSASSIN', 'HEALER', 'SUPPORT');

-- CreateEnum
CREATE TYPE "GameMap" AS ENUM ('SkyTemple', 'TowersOfDoom', 'HauntedMines', 'BattlefieldOfEternity', 'BlackheartsBay', 'CursedHollow', 'DragonShire', 'HauntedWoods', 'InfernalShrines', 'TombOfTheSpiderQueen', 'VolskayaFoundry', 'WarheadJunction', 'BraxisHoldout', 'Hanamura', 'AlteracPass');

-- CreateEnum
CREATE TYPE "Hero" AS ENUM ('Abathur', 'Alarak', 'Alexstrasza', 'Ana', 'Anduin', 'Anubarak', 'Artanis', 'Arthas', 'Auriel', 'Azmodan', 'Blaze', 'Brightwing', 'Cassia', 'Chen', 'Cho', 'Chromie', 'Deathwing', 'Deckard', 'Dehaka', 'Diablo', 'DVa', 'ETC', 'Falstad', 'Fenix', 'Gall', 'Garrosh', 'Gazlowe', 'Genji', 'Greymane', 'Guldan', 'Hanzo', 'Hogger', 'Illidan', 'Imperius', 'Jaina', 'Johanna', 'Junkrat', 'Kaelthas', 'KelThuzad', 'Kerrigan', 'Kharazim', 'Leoric', 'LiLi', 'LiMing', 'LtMorales', 'Lucio', 'Lunara', 'Maiev', 'Malfurion', 'MalGanis', 'Malthael', 'Medivh', 'Mei', 'Mephisto', 'Muradin', 'Murky', 'Nazeebo', 'Nova', 'Orphea', 'Probius', 'Qhira', 'Ragnaros', 'Raynor', 'Rehgar', 'Rexxar', 'Samuro', 'SgtHammer', 'Sonya', 'Stitches', 'Stukov', 'Sylvanas', 'Tassadar', 'TheButcher', 'TheLostVikings', 'Thrall', 'Tracer', 'Tychus', 'Tyrael', 'Tyrande', 'Uther', 'Valeera', 'Valla', 'Varian', 'Xul', 'Whitemane', 'Yrel', 'Zagara', 'Zarya', 'Zeratul', 'Zuljin');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('WIN', 'LOSE', 'DRAW');

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "type" "MatchType" NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "winnerTeamNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_teams" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamNumber" INTEGER NOT NULL,
    "leaderId" TEXT NOT NULL,

    CONSTRAINT "match_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_team_members" (
    "id" TEXT NOT NULL,
    "matchTeamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "match_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "gameNumber" INTEGER NOT NULL,
    "map" "GameMap" NOT NULL,
    "winnerTeamNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_teams" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "teamNumber" INTEGER NOT NULL,
    "sourceMatchTeamId" TEXT NOT NULL,
    "result" "GameResult" NOT NULL,

    CONSTRAINT "game_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_team_bans" (
    "id" TEXT NOT NULL,
    "gameTeamId" TEXT NOT NULL,
    "hero" "Hero" NOT NULL,
    "banOrder" INTEGER NOT NULL,

    CONSTRAINT "game_team_bans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_team_members" (
    "id" TEXT NOT NULL,
    "gameTeamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "hero" "Hero" NOT NULL,
    "kills" INTEGER,
    "deaths" INTEGER,
    "takedowns" INTEGER,
    "heroDamage" INTEGER,
    "damageTaken" INTEGER,

    CONSTRAINT "game_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_nickname_key" ON "players"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "match_teams_matchId_teamNumber_key" ON "match_teams"("matchId", "teamNumber");

-- CreateIndex
CREATE UNIQUE INDEX "match_team_members_matchTeamId_playerId_key" ON "match_team_members"("matchTeamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "games_matchId_gameNumber_key" ON "games"("matchId", "gameNumber");

-- CreateIndex
CREATE UNIQUE INDEX "game_teams_gameId_teamNumber_key" ON "game_teams"("gameId", "teamNumber");

-- CreateIndex
CREATE UNIQUE INDEX "game_team_bans_gameTeamId_banOrder_key" ON "game_team_bans"("gameTeamId", "banOrder");

-- CreateIndex
CREATE UNIQUE INDEX "game_team_bans_gameTeamId_hero_key" ON "game_team_bans"("gameTeamId", "hero");

-- CreateIndex
CREATE INDEX "game_team_members_playerId_idx" ON "game_team_members"("playerId");

-- CreateIndex
CREATE INDEX "game_team_members_hero_idx" ON "game_team_members"("hero");

-- CreateIndex
CREATE INDEX "game_team_members_playerId_hero_idx" ON "game_team_members"("playerId", "hero");

-- CreateIndex
CREATE UNIQUE INDEX "game_team_members_gameTeamId_playerId_key" ON "game_team_members"("gameTeamId", "playerId");

-- AddForeignKey
ALTER TABLE "match_teams" ADD CONSTRAINT "match_teams_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_teams" ADD CONSTRAINT "match_teams_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_team_members" ADD CONSTRAINT "match_team_members_matchTeamId_fkey" FOREIGN KEY ("matchTeamId") REFERENCES "match_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_team_members" ADD CONSTRAINT "match_team_members_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_teams" ADD CONSTRAINT "game_teams_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_teams" ADD CONSTRAINT "game_teams_sourceMatchTeamId_fkey" FOREIGN KEY ("sourceMatchTeamId") REFERENCES "match_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_team_bans" ADD CONSTRAINT "game_team_bans_gameTeamId_fkey" FOREIGN KEY ("gameTeamId") REFERENCES "game_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_team_members" ADD CONSTRAINT "game_team_members_gameTeamId_fkey" FOREIGN KEY ("gameTeamId") REFERENCES "game_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_team_members" ADD CONSTRAINT "game_team_members_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
