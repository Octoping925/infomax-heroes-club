import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult } from "@/generated/prisma/client";
import {
  PlayerHeroWinRateResponse,
  HeroWinRateResponse,
} from "@/app/api/stats/types";
import {
  buildWinRateStatsFromCounts,
  createResultCounts,
  ResultCounts,
  updateCountsByResult,
} from "@/app/api/stats/utils/stats";
import { Hero } from "@/domain/hots/models";

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
    where: { playerId: player.id },
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
  const heroMap = new Map<Hero, ResultCounts>();

  for (const result of results) {
    const current = heroMap.get(result.hero) ?? createResultCounts();
    updateCountsByResult(current, result.gameTeam.result);
    heroMap.set(result.hero, current);
  }

  return Array.from(heroMap.entries())
    .map(([hero, stats]) => ({
      hero,
      ...buildWinRateStatsFromCounts(stats),
    }))
    .sort((a, b) => b.totalGames - a.totalGames);
}
