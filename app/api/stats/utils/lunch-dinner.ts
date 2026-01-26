import { prisma } from "@/config/prisma";
import { GameResult, MatchType } from "@/generated/prisma/client";
import { PlayerLunchDinnerWinRateResponse } from "@/app/api/stats/types";
import { fetchPlayerMap, PlayerMap } from "./player";
import {
  buildWinRateStatsFromCounts,
  createResultCounts,
  ResultCounts,
  updateCountsByResult,
} from "@/app/api/stats/utils/stats";

export type LunchDinnerUnit = "game" | "match";

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
export async function fetchPlayerLunchDinnerWinRate(
  unit: LunchDinnerUnit
): Promise<PlayerLunchDinnerWinRateResponse[]> {
  const playerMap = await fetchPlayerMap();

  const accumulatorMap =
    unit === "match"
      ? await buildAccumulatorByMatch(playerMap)
      : await buildAccumulatorByGame(playerMap);

  return Array.from(accumulatorMap.values(), (acc) => {
    const lunchStats = buildWinRateStatsFromCounts(acc.lunch);
    const dinnerStats = buildWinRateStatsFromCounts(acc.dinner);
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

async function buildAccumulatorByGame(
  playerMap: PlayerMap
): Promise<Map<string, PlayerAccumulator>> {
  const participations = await prisma.gameTeamMember.findMany({
    select: {
      playerId: true,
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
    const playerInfo = playerMap.get(playerId);
    if (!playerInfo) {
      continue;
    }
    const current =
      accumulatorMap.get(playerId) ??
      createAccumulator(
        playerId,
        playerInfo.name,
        playerInfo.nickname,
      );

    const matchType = participation.gameTeam.game.match.type;
    const result = participation.gameTeam.result;

    if (matchType === MatchType.LUNCH) {
      updateCountsByResult(current.lunch, result);
    } else {
      updateCountsByResult(current.dinner, result);
    }

    accumulatorMap.set(playerId, current);
  }

  return accumulatorMap;
}

async function buildAccumulatorByMatch(
  playerMap: PlayerMap
): Promise<Map<string, PlayerAccumulator>> {
  const memberships = await prisma.matchTeamMember.findMany({
    select: {
      playerId: true,
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
    const playerInfo = playerMap.get(playerId);
    if (!playerInfo) {
      continue;
    }
    const current =
      accumulatorMap.get(playerId) ??
      createAccumulator(playerId, playerInfo.name, playerInfo.nickname);

    const matchType = membership.matchTeam.match.type;
    const winnerTeamNumber = membership.matchTeam.match.winnerTeamNumber;
    const teamNumber = membership.matchTeam.teamNumber;

    const result = toResultByWinnerTeamNumber(winnerTeamNumber, teamNumber);

    if (matchType === MatchType.LUNCH) {
      updateCountsByResult(current.lunch, result);
    } else {
      updateCountsByResult(current.dinner, result);
    }

    accumulatorMap.set(playerId, current);
  }

  return accumulatorMap;
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
    lunch: createResultCounts(),
    dinner: createResultCounts(),
  };
}

function toResultByWinnerTeamNumber(
  winnerTeamNumber: number | null,
  teamNumber: number
): GameResult {
  if (winnerTeamNumber === null) return GameResult.DRAW;
  if (winnerTeamNumber === teamNumber) return GameResult.WIN;
  return GameResult.LOSE;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
