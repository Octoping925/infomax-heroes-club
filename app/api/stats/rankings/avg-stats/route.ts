import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { PlayerAverageStatsResponse, calculateAverage } from "@/app/api/stats/types";
import { fetchPlayerMap } from "../../utils/player";

type PlayerAccumulator = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  totalGames: number;
  totalKills: number;
  totalDeaths: number;
  totalTakedowns: number;
  totalHeroDamage: number;
  totalSiegeDamage: number;
  totalHealingDone: number;
  totalDamageTaken: number;
};

/**
 * 평균 스탯 랭킹 조회 (게임 단위)
 * GET /api/stats/rankings/avg-stats
 */
export async function GET(): Promise<NextResponse<PlayerAverageStatsResponse[]>> {
  const playerMap = await fetchPlayerMap();
  const participations = await prisma.gameTeamMember.findMany({
    select: {
      playerId: true,
      kills: true,
      deaths: true,
      takedowns: true,
      heroDamage: true,
      siegeDamage: true,
      healingDone: true,
      damageTaken: true,
    },
  });

  const accumulatorMap = new Map<string, PlayerAccumulator>();

  for (const participation of participations) {
    const playerId = participation.playerId;
    const player = playerMap.get(playerId);

    if (!player) continue;

    const current = accumulatorMap.get(playerId) ?? createAccumulator(playerId, player.name, player.nickname);

    current.totalGames++;
    current.totalKills += participation.kills;
    current.totalDeaths += participation.deaths;
    current.totalTakedowns += participation.takedowns;
    current.totalHeroDamage += participation.heroDamage;
    current.totalDamageTaken += participation.damageTaken;

    accumulatorMap.set(playerId, current);
  }

  const response = Array.from(accumulatorMap.values(), (it) => ({
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

function createAccumulator(playerId: string, playerName: string, playerNickname: string): PlayerAccumulator {
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
    totalSiegeDamage: 0,
    totalHealingDone: 0,
  };
}
