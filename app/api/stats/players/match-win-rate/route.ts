import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { PlayerWinRateResponse } from "@/app/api/stats/types";
import { fetchPlayerMap } from "../../utils/player";
import {
  buildWinRateStatsFromCounts,
  createResultCounts,
  ResultCounts,
  toResultByWinnerTeamNumber,
  updateCountsByResult,
} from "@/app/api/stats/utils/stats";

type PlayerAccumulator = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  stats: ResultCounts;
};

/**
 * 플레이어별 내전(match) 총 승률 조회 (매치 단위)
 * GET /api/stats/players/match-win-rate
 *
 * 주의: game 승률이 아니라 match 승률입니다.
 * - match 1건을 1경기로 간주합니다.
 * - match.winnerTeamNumber 기준으로 승/패/무를 계산합니다.
 */
export async function GET(): Promise<NextResponse<PlayerWinRateResponse[]>> {
  const playerMap = await fetchPlayerMap();
  const memberships = await prisma.matchTeamMember.findMany({
    select: {
      playerId: true,
      matchTeam: {
        select: {
          teamNumber: true,
          match: {
            select: {
              winnerTeamNumber: true,
            },
          },
        },
      },
    },
  });

  const accumulatorMap = new Map<string, PlayerAccumulator>();

  for (const membership of memberships) {
    const playerId = membership.playerId;
    const playerInfo = playerMap.get(playerId);
    if (!playerInfo) {
      continue;
    }
    const current = accumulatorMap.get(playerId) ?? createAccumulator(playerId, playerInfo.name, playerInfo.nickname);

    const winnerTeamNumber = membership.matchTeam.match.winnerTeamNumber;
    const result = toResultByWinnerTeamNumber(winnerTeamNumber, membership.matchTeam.teamNumber);
    updateCountsByResult(current.stats, result);

    accumulatorMap.set(playerId, current);
  }

  const response: PlayerWinRateResponse[] = Array.from(accumulatorMap.values())
    .map((acc) => {
      const stats = buildWinRateStatsFromCounts(acc.stats);
      return {
        playerId: acc.playerId,
        playerName: acc.playerName,
        playerNickname: acc.playerNickname,
        totalGames: stats.totalGames,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        winRate: stats.winRate,
      };
    })
    .filter((item) => item.totalGames > 0)
    .sort((a, b) => b.winRate - a.winRate || b.totalGames - a.totalGames);

  return NextResponse.json(response);
}

function createAccumulator(playerId: string, playerName: string, playerNickname: string): PlayerAccumulator {
  return {
    playerId,
    playerName,
    playerNickname,
    stats: createResultCounts(),
  };
}
