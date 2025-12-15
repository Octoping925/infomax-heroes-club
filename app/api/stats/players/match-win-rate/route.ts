import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { PlayerWinRateResponse, calculateWinRate } from "@/app/api/stats/types";

type PlayerAccumulator = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  wins: number;
  losses: number;
  draws: number;
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

    const winnerTeamNumber = membership.matchTeam.match.winnerTeamNumber;
    if (winnerTeamNumber === null) {
      current.draws++;
    } else if (winnerTeamNumber === membership.matchTeam.teamNumber) {
      current.wins++;
    } else {
      current.losses++;
    }

    accumulatorMap.set(playerId, current);
  }

  const response: PlayerWinRateResponse[] = Array.from(accumulatorMap.values())
    .map((acc) => {
      const totalGames = acc.wins + acc.losses + acc.draws;
      return {
        playerId: acc.playerId,
        playerName: acc.playerName,
        playerNickname: acc.playerNickname,
        totalGames,
        wins: acc.wins,
        losses: acc.losses,
        draws: acc.draws,
        winRate: calculateWinRate(acc.wins, totalGames),
      };
    })
    .filter((item) => item.totalGames > 0)
    .sort((a, b) => b.winRate - a.winRate || b.totalGames - a.totalGames);

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
    wins: 0,
    losses: 0,
    draws: 0,
  };
}


