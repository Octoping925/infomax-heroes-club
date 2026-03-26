import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { PlayerCombinedWinRateResponse } from "@/app/api/stats/types";
import { fetchPlayerMap } from "../../utils/player";
import {
  buildWinRateStatsFromCounts,
  createResultCounts,
  ResultCounts,
  toResultByWinnerTeamNumber,
  updateCountsByResult,
} from "@/app/api/stats/utils/stats";
import { buildPlayedAtYearFilter, parseYearParam } from "@/app/api/stats/utils/query";

type PlayerAccumulator = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly matchStats: ResultCounts;
  readonly gameStats: ResultCounts;
};

export async function GET(request: Request): Promise<NextResponse<ReadonlyArray<PlayerCombinedWinRateResponse>>> {
  const year = parseYearParam(new URL(request.url).searchParams.get("year"));
  const playedAt = buildPlayedAtYearFilter(year);
  const playerMap = await fetchPlayerMap();

  const [matchMemberships, gameMemberships] = await Promise.all([
    prisma.matchTeamMember.findMany({
      where: playedAt
        ? {
            matchTeam: {
              match: {
                playedAt,
              },
            },
          }
        : undefined,
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
    }),
    prisma.gameTeamMember.findMany({
      where: playedAt
        ? {
            gameTeam: {
              game: {
                match: {
                  playedAt,
                },
              },
            },
          }
        : undefined,
      select: {
        playerId: true,
        gameTeam: {
          select: {
            result: true,
          },
        },
      },
    }),
  ]);

  const accumulator = new Map<string, PlayerAccumulator>();

  const getOrCreate = (playerId: string, playerName: string, playerNickname: string): PlayerAccumulator => {
    const existing = accumulator.get(playerId);
    if (existing) {
      return existing;
    }
    const created: PlayerAccumulator = {
      playerId,
      playerName,
      playerNickname,
      matchStats: createResultCounts(),
      gameStats: createResultCounts(),
    };
    accumulator.set(playerId, created);
    return created;
  };

  for (const membership of matchMemberships) {
    const playerInfo = playerMap.get(membership.playerId);
    if (!playerInfo) {
      continue;
    }
    const entry = getOrCreate(membership.playerId, playerInfo.name, playerInfo.nickname);

    const winner = membership.matchTeam.match.winnerTeamNumber;
    const result = toResultByWinnerTeamNumber(winner, membership.matchTeam.teamNumber);
    updateCountsByResult(entry.matchStats, result);
  }

  for (const membership of gameMemberships) {
    const playerInfo = playerMap.get(membership.playerId);
    if (!playerInfo) {
      continue;
    }
    const entry = getOrCreate(membership.playerId, playerInfo.name, playerInfo.nickname);

    updateCountsByResult(entry.gameStats, membership.gameTeam.result);
  }

  const response: PlayerCombinedWinRateResponse[] = accumulator
    .values()
    .map((entry) => ({
      playerId: entry.playerId,
      playerName: entry.playerName,
      playerNickname: entry.playerNickname,
      matchStats: buildWinRateStatsFromCounts(entry.matchStats),
      gameStats: buildWinRateStatsFromCounts(entry.gameStats),
    }))
    .filter((entry) => entry.matchStats.totalGames > 0 || entry.gameStats.totalGames > 0)
    .toArray();

  return NextResponse.json(response);
}
