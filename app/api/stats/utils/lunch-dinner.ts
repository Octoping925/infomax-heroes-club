import { prisma } from "@/config/prisma";
import { GameResult, MatchType } from "@/generated/prisma/client";
import {
  PlayerLunchDinnerWinRateResponse,
  WinRateStats,
} from "@/app/api/stats/types";
import { calculateWinRate } from "@/utils/win-rate";

export type LunchDinnerUnit = "game" | "match";

type ResultCounts = { wins: number; losses: number; draws: number };

type PlayerAccumulator = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly lunch: ResultCounts;
  readonly dinner: ResultCounts;
};

/**
 * 점심/저녁 내전 승률 유닛 파싱
 */
export function parseLunchDinnerUnit(input: string | null): LunchDinnerUnit {
  if (input === "match") return "match";
  return "game";
}

/**
 * 플레이어별 점심/저녁 승률 집계 결과를 조회합니다.
 *
 * - unit=game: gameTeamMember 기준(게임 단위)
 * - unit=match: matchTeamMember + match.winnerTeamNumber 기준(매치 단위)
 */
export async function fetchPlayerLunchDinnerWinRate(input: {
  readonly unit: LunchDinnerUnit;
}): Promise<PlayerLunchDinnerWinRateResponse[]> {
  const accumulatorMap =
    input.unit === "match"
      ? await buildAccumulatorByMatch()
      : await buildAccumulatorByGame();

  return Array.from(accumulatorMap.values()).map((acc) => {
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
  });
}

async function buildAccumulatorByGame(): Promise<
  Map<string, PlayerAccumulator>
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

  return accumulatorMap;
}

async function buildAccumulatorByMatch(): Promise<
  Map<string, PlayerAccumulator>
> {
  const memberships = await prisma.matchTeamMember.findMany({
    select: {
      playerId: true,
      player: {
        select: {
          name: true,
          nickname: true,
        },
      },
      matchTeam: {
        select: {
          teamNumber: true,
          match: {
            select: {
              type: true,
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
    const current =
      accumulatorMap.get(playerId) ??
      createAccumulator({
        playerId,
        playerName: membership.player.name,
        playerNickname: membership.player.nickname,
      });

    const matchType = membership.matchTeam.match.type;
    const winnerTeamNumber = membership.matchTeam.match.winnerTeamNumber;
    const teamNumber = membership.matchTeam.teamNumber;

    const result = toResultByWinnerTeamNumber({
      winnerTeamNumber,
      teamNumber,
    });

    if (matchType === MatchType.LUNCH) {
      updateResultCounts(current.lunch, result);
    } else {
      updateResultCounts(current.dinner, result);
    }

    accumulatorMap.set(playerId, current);
  }

  return accumulatorMap;
}

function createAccumulator(input: {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
}): PlayerAccumulator {
  return {
    playerId: input.playerId,
    playerName: input.playerName,
    playerNickname: input.playerNickname,
    lunch: { wins: 0, losses: 0, draws: 0 },
    dinner: { wins: 0, losses: 0, draws: 0 },
  };
}

function toResultByWinnerTeamNumber(input: {
  readonly winnerTeamNumber: number | null;
  readonly teamNumber: number;
}): GameResult {
  if (input.winnerTeamNumber === null) return GameResult.DRAW;
  if (input.winnerTeamNumber === input.teamNumber) return GameResult.WIN;
  return GameResult.LOSE;
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
  return {
    totalGames: counts.wins + counts.losses + counts.draws,
    wins: counts.wins,
    losses: counts.losses,
    draws: counts.draws,
    winRate: calculateWinRate(counts.wins, counts.losses, counts.draws),
  };
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
