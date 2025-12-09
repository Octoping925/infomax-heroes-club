/*
  Warnings:

  - You are about to drop the column `endedAt` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `team1Kills` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `team2Kills` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `healingDone` on the `GamePlayerStats` table. All the data in the column will be lost.
  - You are about to drop the column `universe` on the `Hero` table. All the data in the column will be lost.
  - You are about to drop the column `isDraw` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `maxGames` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `targetWins` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `battletag` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `joinedAt` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `memo` on the `Player` table. All the data in the column will be lost.
  - Made the column `mapName` on table `Game` required. This step will fail if there are existing NULL values in that column.
  - Made the column `heroId` on table `GamePlayerStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `kills` on table `GamePlayerStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `deaths` on table `GamePlayerStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `takedowns` on table `GamePlayerStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `damageDone` on table `GamePlayerStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `damageTaken` on table `GamePlayerStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `note` on table `GamePlayerStats` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `date` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gameCount` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GamePlayerStats" DROP CONSTRAINT "GamePlayerStats_heroId_fkey";

-- DropIndex
DROP INDEX "Match_matchType_startedAt_idx";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "endedAt",
DROP COLUMN "startedAt",
DROP COLUMN "team1Kills",
DROP COLUMN "team2Kills",
ALTER COLUMN "mapName" SET NOT NULL;

-- AlterTable
ALTER TABLE "GamePlayerStats" DROP COLUMN "healingDone",
ALTER COLUMN "heroId" SET NOT NULL,
ALTER COLUMN "kills" SET NOT NULL,
ALTER COLUMN "deaths" SET NOT NULL,
ALTER COLUMN "takedowns" SET NOT NULL,
ALTER COLUMN "damageDone" SET NOT NULL,
ALTER COLUMN "damageTaken" SET NOT NULL,
ALTER COLUMN "note" SET NOT NULL;

-- AlterTable
ALTER TABLE "Hero" DROP COLUMN "universe";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "isDraw",
DROP COLUMN "maxGames",
DROP COLUMN "startedAt",
DROP COLUMN "targetWins",
ADD COLUMN     "date" TEXT NOT NULL,
ADD COLUMN     "gameCount" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "battletag",
DROP COLUMN "joinedAt",
DROP COLUMN "memo",
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Match_matchType_date_idx" ON "Match"("matchType", "date" DESC);

-- AddForeignKey
ALTER TABLE "GamePlayerStats" ADD CONSTRAINT "GamePlayerStats_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "Hero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
