import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import {
  PlayerAverageKillsDeathsResponse,
  calculateAverage,
} from "@/app/api/stats/types";

type PlayerAccumulator = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  totalGames: number;
  totalKills: number;
  totalDeaths: number;
};

/**
 * 평균 킬 / 평균 데스 랭킹 조회 (게임 단위)
 * GET /api/stats/rankings/avg-kills-deaths
 */
export async function GET(): Promise<
  NextResponse<PlayerAverageKillsDeathsResponse[]>
> {
  const participations = await prisma.gameTeamMember.findMany({
    select: {
      playerId: true,
      kills: true,
      deaths: true,
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
      createAccumulator({
        playerId,
        playerName: participation.player.name,
        playerNickname: participation.player.nickname,
      });

    current.totalGames++;
    current.totalKills += participation.kills ?? 0;
    current.totalDeaths += participation.deaths ?? 0;

    accumulatorMap.set(playerId, current);
  }

  const response: PlayerAverageKillsDeathsResponse[] = Array.from(
    accumulatorMap.values()
  )
    .map((acc) => ({
      playerId: acc.playerId,
      playerName: acc.playerName,
      playerNickname: acc.playerNickname,
      totalGames: acc.totalGames,
      averageKills: calculateAverage(acc.totalKills, acc.totalGames),
      averageDeaths: calculateAverage(acc.totalDeaths, acc.totalGames),
    }))
    .filter((item) => item.totalGames > 0);

  return NextResponse.json(response);
}

function createAccumulator(input: {
  playerId: string;
  playerName: string;
  playerNickname: string;
}): PlayerAccumulator {
  return {
    playerId: input.playerId,
    playerName: input.playerName,
    playerNickname: input.playerNickname,
    totalGames: 0,
    totalKills: 0,
    totalDeaths: 0,
  };
}


