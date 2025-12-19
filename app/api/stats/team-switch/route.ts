import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult } from "@/generated/prisma/client";
import { TeamSwitchWinRateResponse, WinRateStats } from "@/app/api/stats/types";
import { calculateWinRate } from "@/utils/win-rate";

/**
 * 매치팀과 다른 게임팀에서 승률이 좋은 사람 조회
 * GET /api/stats/team-switch
 *
 * 초기 편성(MatchTeam)과 다른 팀(GameTeam)에서 뛴 경기의 승률을 비교합니다.
 */
export async function GET(): Promise<
  NextResponse<TeamSwitchWinRateResponse[]>
> {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      nickname: true,
    },
  });

  const results: TeamSwitchWinRateResponse[] = [];

  for (const player of players) {
    const playerStats = await calculatePlayerTeamSwitchStats(player.id);

    if (playerStats.originalTeamStats.totalGames === 0) {
      continue;
    }

    results.push({
      playerId: player.id,
      playerName: player.name,
      playerNickname: player.nickname,
      ...playerStats,
    });
  }

  // 팀 변경 시 승률 차이가 높은 순으로 정렬
  return NextResponse.json(
    results.sort((a, b) => b.switchedWinRateDiff - a.switchedWinRateDiff),
    {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    }
  );
}

type PlayerTeamSwitchStats = {
  originalTeamStats: WinRateStats;
  switchedTeamStats: WinRateStats;
  switchedWinRateDiff: number;
};

async function calculatePlayerTeamSwitchStats(
  playerId: string
): Promise<PlayerTeamSwitchStats> {
  // 플레이어가 참여한 모든 게임 정보 조회
  const gameParticipations = await prisma.gameTeamMember.findMany({
    where: { playerId },
    select: {
      gameTeam: {
        select: {
          result: true,
          sourceMatchTeamId: true,
          game: {
            select: {
              matchId: true,
            },
          },
        },
      },
    },
  });

  // 플레이어가 소속된 매치팀 정보 조회
  const matchTeamMemberships = await prisma.matchTeamMember.findMany({
    where: { playerId },
    select: {
      matchTeam: {
        select: {
          id: true,
          matchId: true,
        },
      },
    },
  });

  // matchId -> 플레이어의 원래 matchTeamId 매핑
  const originalTeamMap = new Map<string, string>();
  for (const membership of matchTeamMemberships) {
    originalTeamMap.set(membership.matchTeam.matchId, membership.matchTeam.id);
  }

  const originalTeamResults: GameResult[] = [];
  const switchedTeamResults: GameResult[] = [];

  for (const participation of gameParticipations) {
    const matchId = participation.gameTeam.game.matchId;
    const originalMatchTeamId = originalTeamMap.get(matchId);
    const currentMatchTeamId = participation.gameTeam.sourceMatchTeamId;

    if (originalMatchTeamId === currentMatchTeamId) {
      originalTeamResults.push(participation.gameTeam.result);
    } else {
      switchedTeamResults.push(participation.gameTeam.result);
    }
  }

  const originalTeamStats = buildWinRateStats(originalTeamResults);
  const switchedTeamStats = buildWinRateStats(switchedTeamResults);

  return {
    originalTeamStats,
    switchedTeamStats,
    switchedWinRateDiff: switchedTeamStats.winRate - originalTeamStats.winRate,
  };
}

function buildWinRateStats(results: GameResult[]): WinRateStats {
  const totalGames = results.length;
  const wins = results.filter((r) => r === GameResult.WIN).length;
  const losses = results.filter((r) => r === GameResult.LOSE).length;
  const draws = results.filter((r) => r === GameResult.DRAW).length;

  return {
    totalGames,
    wins,
    losses,
    draws,
    winRate: calculateWinRate(wins, losses, draws),
  };
}
