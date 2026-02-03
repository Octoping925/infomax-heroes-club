/*
  Warnings:

  - Made the column `kills` on table `game_team_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `deaths` on table `game_team_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `takedowns` on table `game_team_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `heroDamage` on table `game_team_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `damageTaken` on table `game_team_members` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "game_team_members" ADD COLUMN     "healingDone" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "siegeDamage" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "kills" SET NOT NULL,
ALTER COLUMN "deaths" SET NOT NULL,
ALTER COLUMN "takedowns" SET NOT NULL,
ALTER COLUMN "heroDamage" SET NOT NULL,
ALTER COLUMN "heroDamage" SET DEFAULT 0,
ALTER COLUMN "damageTaken" SET NOT NULL,
ALTER COLUMN "damageTaken" SET DEFAULT 0;
