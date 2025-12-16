import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import {
  PlayerCombinedWinRateResponse,
  WinRateStats,
  calculateWinRate,
} from "@/app/api/stats/types";
import { GameResult } from "@/generated/prisma/client";

type StatAccumulator = {
  wins: number;
  losses: number;
  draws: number;
};

type PlayerAccumulator = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly matchStats: StatAccumulator;
  readonly gameStats: StatAccumulator;
};

export async function GET(): Promise<
  NextResponse<ReadonlyArray<PlayerCombinedWinRateResponse>>
> {
  const [matchMemberships, gameMemberships] = await Promise.all([
    prisma.matchTeamMember.findMany({
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
        player: {
          select: {
            name: true,
            nickname: true,
          },
        },
        gameTeam: {
          select: {
            result: true,
          },
        },
      },
    }),
  ]);

  const accumulator = new Map<string, PlayerAccumulator>();

  const getOrCreate = (input: {
    playerId: string;
    playerName: string;
    playerNickname: string;
  }): PlayerAccumulator => {
    const existing = accumulator.get(input.playerId);
    if (existing) {
      return existing;
    }
    const created: PlayerAccumulator = {
      playerId: input.playerId,
      playerName: input.playerName,
      playerNickname: input.playerNickname,
      matchStats: { wins: 0, losses: 0, draws: 0 },
      gameStats: { wins: 0, losses: 0, draws: 0 },
    };
    accumulator.set(input.playerId, created);
    return created;
  };

  for (const membership of matchMemberships) {
    const entry = getOrCreate({
      playerId: membership.playerId,
      playerName: membership.player.name,
      playerNickname: membership.player.nickname,
    });

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
    const entry = getOrCreate({
      playerId: membership.playerId,
      playerName: membership.player.name,
      playerNickname: membership.player.nickname,
    });

    const result = membership.gameTeam.result as GameResult | null;
    if (result === "WIN") {
      entry.gameStats.wins += 1;
    } else if (result === "LOSE") {
      entry.gameStats.losses += 1;
    } else {
      entry.gameStats.draws += 1;
    }
  }

  const toResponse = (stats: StatAccumulator): WinRateStats => {
    const totalGames = stats.wins + stats.losses + stats.draws;
    return {
      totalGames,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate: calculateWinRate(stats.wins, totalGames),
    };
  };

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
