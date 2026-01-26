import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import {
  PlayerCombinedWinRateResponse,
  WinRateStats,
} from "@/app/api/stats/types";
import { GameResult } from "@/generated/prisma/client";
import { fetchPlayerMap } from "../../utils/player";
import {
  buildWinRateStatsFromCounts,
  createResultCounts,
  ResultCounts,
  updateCountsByResult,
} from "@/app/api/stats/utils/stats";

type PlayerAccumulator = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly matchStats: ResultCounts;
  readonly gameStats: ResultCounts;
};

export async function GET(): Promise<
  NextResponse<ReadonlyArray<PlayerCombinedWinRateResponse>>
> {
  const playerMap = await fetchPlayerMap();

  const [matchMemberships, gameMemberships] = await Promise.all([
    prisma.matchTeamMember.findMany({
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

  const getOrCreate = (
    playerId: string,
    playerName: string,
    playerNickname: string
  ): PlayerAccumulator => {
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
    const entry = getOrCreate(
      membership.playerId,
      playerInfo.name,
      playerInfo.nickname
    );

    const winner = membership.matchTeam.match.winnerTeamNumber;
    if (winner === null) {
      entry.matchStats.draws += 1;
    } else if (winner === membership.matchTeam.teamNumber) {
      entry.matchStats.wins += 1;
    } else {
      entry.matchStats.losses += 1;
    }
  }

  for (const membership of gameMemberships) {
    const playerInfo = playerMap.get(membership.playerId);
    if (!playerInfo) {
      continue;
    }
    const entry = getOrCreate(
      membership.playerId,
      playerInfo.name,
      playerInfo.nickname
    );

    const result = membership.gameTeam.result as GameResult | null;
    if (result) {
      updateCountsByResult(entry.gameStats, result);
    }
  }

  const toResponse = (stats: ResultCounts): WinRateStats =>
    buildWinRateStatsFromCounts(stats);

  const response: PlayerCombinedWinRateResponse[] = Array.from(
    accumulator.values()
  )
    .map((entry) => ({
      playerId: entry.playerId,
      playerName: entry.playerName,
      playerNickname: entry.playerNickname,
      matchStats: toResponse(entry.matchStats),
      gameStats: toResponse(entry.gameStats),
    }))
    .filter(
      (entry) =>
        entry.matchStats.totalGames > 0 || entry.gameStats.totalGames > 0
    )
    .sort((a, b) => {
      if (b.matchStats.winRate !== a.matchStats.winRate) {
        return b.matchStats.winRate - a.matchStats.winRate;
      }
      return b.matchStats.totalGames - a.matchStats.totalGames;
    });

  return NextResponse.json(response);
}
