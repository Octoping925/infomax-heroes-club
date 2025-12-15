import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult, MatchType } from "@/generated/prisma/client";
import {
  PlayerLunchDinnerWinRateResponse,
  WinRateStats,
  calculateWinRate,
} from "@/app/api/stats/types";

type PlayerLunchDinnerAccumulator = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly lunch: { wins: number; losses: number; draws: number };
  readonly dinner: { wins: number; losses: number; draws: number };
};

/**
 * 플레이어별 점심/저녁 내전 승률 조회 (게임 단위)
 * GET /api/stats/players/lunch-dinner
 */
export async function GET(): Promise<
  NextResponse<PlayerLunchDinnerWinRateResponse[]>
> {
  const participations = await prisma.gameTeamMember.findMany({
    select: {
      playerId: true,
      player: {
        select: {
          name: true,
          nickname: true,
        },
      },
      gameTeam: {
        select: {
          result: true,
          game: {
            select: {
              match: {
                select: {
                  type: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const accumulatorMap = new Map<string, PlayerLunchDinnerAccumulator>();

  for (const participation of participations) {
    const playerId = participation.playerId;
    const current =
      accumulatorMap.get(playerId) ??
      createAccumulator({
        playerId,
        playerName: participation.player.name,
        playerNickname: participation.player.nickname,
      });

    const matchType = participation.gameTeam.game.match.type;
    const result = participation.gameTeam.result;

    if (matchType === MatchType.LUNCH) {
      updateResultCounts(current.lunch, result);
    } else {
      updateResultCounts(current.dinner, result);
    }

    accumulatorMap.set(playerId, current);
  }

  const response: PlayerLunchDinnerWinRateResponse[] = Array.from(
    accumulatorMap.values()
  )
    .map((acc) => {
      const lunchStats = buildWinRateStats(acc.lunch);
      const dinnerStats = buildWinRateStats(acc.dinner);
      const dinnerWinRateDiff = dinnerStats.winRate - lunchStats.winRate;

      return {
        playerId: acc.playerId,
        playerName: acc.playerName,
        playerNickname: acc.playerNickname,
        lunchStats,
        dinnerStats,
        dinnerWinRateDiff: roundToTwoDecimals(dinnerWinRateDiff),
        absWinRateDiff: roundToTwoDecimals(Math.abs(dinnerWinRateDiff)),
      };
    })
    .sort(
      (a, b) =>
        b.lunchStats.totalGames +
        b.dinnerStats.totalGames -
        (a.lunchStats.totalGames + a.dinnerStats.totalGames)
    );

  return NextResponse.json(response);
}

function createAccumulator(input: {
  playerId: string;
  playerName: string;
  playerNickname: string;
}): PlayerLunchDinnerAccumulator {
  return {
    playerId: input.playerId,
    playerName: input.playerName,
    playerNickname: input.playerNickname,
    lunch: { wins: 0, losses: 0, draws: 0 },
    dinner: { wins: 0, losses: 0, draws: 0 },
  };
}

function updateResultCounts(
  counts: { wins: number; losses: number; draws: number },
  result: GameResult
): void {
  if (result === GameResult.WIN) {
    counts.wins++;
    return;
  }
  if (result === GameResult.LOSE) {
    counts.losses++;
    return;
  }
  counts.draws++;
}

function buildWinRateStats(counts: {
  wins: number;
  losses: number;
  draws: number;
}): WinRateStats {
  const totalGames = counts.wins + counts.losses + counts.draws;
  return {
    totalGames,
    wins: counts.wins,
    losses: counts.losses,
    draws: counts.draws,
    winRate: calculateWinRate(counts.wins, totalGames),
  };
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}


