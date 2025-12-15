import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult, MatchType } from "@/generated/prisma/client";
import {
  PlayerLunchDinnerWinRateResponse,
  WinRateStats,
  calculateWinRate,
} from "@/app/api/stats/types";

type ResultCounts = { wins: number; losses: number; draws: number };

type PlayerAccumulator = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly lunch: ResultCounts;
  readonly dinner: ResultCounts;
};

/**
 * 점심/저녁 승률 차이가 많이 나는 사람 순위 (게임 단위)
 * GET /api/stats/rankings/lunch-dinner-diff
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
    // 양쪽(점심/저녁)에 최소 1경기 이상 있는 사람만 비교 대상으로 포함
    .filter(
      (item) => item.lunchStats.totalGames > 0 && item.dinnerStats.totalGames > 0
    )
    .sort((a, b) => b.absWinRateDiff - a.absWinRateDiff);

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
    lunch: { wins: 0, losses: 0, draws: 0 },
    dinner: { wins: 0, losses: 0, draws: 0 },
  };
}

function updateResultCounts(counts: ResultCounts, result: GameResult): void {
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

function buildWinRateStats(counts: ResultCounts): WinRateStats {
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


