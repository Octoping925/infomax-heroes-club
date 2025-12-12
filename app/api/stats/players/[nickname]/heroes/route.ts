import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult, Hero } from "@/generated/prisma/client";
import {
  PlayerHeroWinRateResponse,
  HeroWinRateResponse,
  calculateWinRate,
} from "@/app/api/stats/types";

type RouteParams = {
  params: Promise<{ nickname: string }>;
};

/**
 * 특정 플레이어의 영웅별 승률 조회
 * GET /api/stats/players/[nickname]/heroes
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<PlayerHeroWinRateResponse | { error: string }>> {
  const { nickname } = await params;

  const player = await prisma.player.findUnique({
    where: { nickname: nickname },
    select: {
      id: true,
      name: true,
      nickname: true,
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const gameResults = await prisma.gameTeamMember.findMany({
    where: { playerId: nickname },
    select: {
      hero: true,
      gameTeam: {
        select: {
          result: true,
        },
      },
    },
  });

  const heroStats = aggregateHeroStats(gameResults);

  const response: PlayerHeroWinRateResponse = {
    playerId: player.id,
    playerName: player.name,
    playerNickname: player.nickname,
    heroStats,
  };

  return NextResponse.json(response);
}

type GameResultWithHero = {
  hero: Hero;
  gameTeam: { result: GameResult };
};

function aggregateHeroStats(
  results: GameResultWithHero[]
): HeroWinRateResponse[] {
  const heroMap = new Map<
    Hero,
    { wins: number; losses: number; draws: number }
  >();

  for (const result of results) {
    const current = heroMap.get(result.hero) ?? {
      wins: 0,
      losses: 0,
      draws: 0,
    };

    if (result.gameTeam.result === GameResult.WIN) {
      current.wins++;
    } else if (result.gameTeam.result === GameResult.LOSE) {
      current.losses++;
    } else {
      current.draws++;
    }

    heroMap.set(result.hero, current);
  }

  return Array.from(heroMap.entries())
    .map(([hero, stats]) => {
      const totalGames = stats.wins + stats.losses + stats.draws;
      return {
        hero,
        totalGames,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        winRate: calculateWinRate(stats.wins, totalGames),
      };
    })
    .sort((a, b) => b.totalGames - a.totalGames);
}
