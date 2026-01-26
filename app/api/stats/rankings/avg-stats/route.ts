import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import {
  PlayerAverageStatsResponse,
  calculateAverage,
} from "@/app/api/stats/types";

type PlayerAccumulator = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  totalGames: number;
  totalKills: number;
  totalDeaths: number;
  totalTakedowns: number;
  totalHeroDamage: number;
  totalDamageTaken: number;
};

/**
 * 평균 스탯 랭킹 조회 (게임 단위)
 * GET /api/stats/rankings/avg-stats
 */
export async function GET(): Promise<
  NextResponse<PlayerAverageStatsResponse[]>
> {
  const participations = await prisma.gameTeamMember.findMany({
    select: {
      playerId: true,
      kills: true,
      deaths: true,
      takedowns: true,
      heroDamage: true,
      damageTaken: true,
      player: {
        select: {
          name: true,
          nickname: true,
        },
      },
    },
  });

  const accumulatorMap = new Map<string, PlayerAccumulator>();

  for (const participation of participations) {
    const playerId = participation.playerId;
    const current =
      accumulatorMap.get(playerId) ??
      createAccumulator(
        playerId,
        participation.player.name,
        participation.player.nickname
      );

    current.totalGames++;
    current.totalKills += participation.kills ?? 0;
    current.totalDeaths += participation.deaths ?? 0;
    current.totalTakedowns += participation.takedowns ?? 0;
    current.totalHeroDamage += participation.heroDamage ?? 0;
    current.totalDamageTaken += participation.damageTaken ?? 0;

    accumulatorMap.set(playerId, current);
  }

  const response = Array.from(accumulatorMap.values())
    .filter((it) => it.totalGames > 0)
    .map((it) => ({
      playerId: it.playerId,
      playerName: it.playerName,
      playerNickname: it.playerNickname,
      totalGames: it.totalGames,
      averageKills: calculateAverage(it.totalKills, it.totalGames),
      averageDeaths: calculateAverage(it.totalDeaths, it.totalGames),
      averageTakedowns: calculateAverage(it.totalTakedowns, it.totalGames),
      averageHeroDamage: calculateAverage(it.totalHeroDamage, it.totalGames),
      averageDamageTaken: calculateAverage(it.totalDamageTaken, it.totalGames),
    }));

  return NextResponse.json(response);
}

function createAccumulator(
  playerId: string,
  playerName: string,
  playerNickname: string
): PlayerAccumulator {
  return {
    playerId,
    playerName,
    playerNickname,
    totalGames: 0,
    totalKills: 0,
    totalDeaths: 0,
    totalTakedowns: 0,
    totalHeroDamage: 0,
    totalDamageTaken: 0,
  };
}
