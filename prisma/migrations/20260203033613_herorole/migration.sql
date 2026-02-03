/*
  Warnings:

  - The values [BRUISER,RANGED_ASSASSIN,MELEE_ASSASSIN,SUPPORT] on the enum `HeroRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "HeroRole_new" AS ENUM ('TANKER', 'OFFLANER', 'MAIN_DEALER', 'SUB_DEALER', 'HEALER');
ALTER TYPE "HeroRole" RENAME TO "HeroRole_old";
ALTER TYPE "HeroRole_new" RENAME TO "HeroRole";
DROP TYPE "public"."HeroRole_old";
COMMIT;

-- AlterTable
ALTER TABLE "game_team_members" ADD COLUMN     "dpm" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mercCampCaptures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "regenGlobes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timeCCdEnemyHeroes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timeSpentDead" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "watchTowerCaptures" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "game_teams" ADD COLUMN     "teamLevel" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "gameLength" INTEGER NOT NULL DEFAULT 0;
