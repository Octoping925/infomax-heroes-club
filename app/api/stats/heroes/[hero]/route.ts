import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult, Hero } from "@/generated/prisma/client";
import { HeroWinRateResponse, calculateWinRate } from "@/app/api/stats/types";

type RouteParams = {
  params: Promise<{ hero: string }>;
};

/**
 * 특정 영웅의 통산 승률 조회
 * GET /api/stats/heroes/[hero]
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<HeroWinRateResponse | { error: string }>> {
  const { hero } = await params;

  if (!isValidHero(hero)) {
    return NextResponse.json({ error: "Invalid hero name" }, { status: 400 });
  }

  const gameResults = await prisma.gameTeamMember.findMany({
    where: { hero: hero as Hero },
    select: {
      gameTeam: {
        select: {
          result: true,
        },
      },
    },
  });

  const stats = calculateGameStats(gameResults.map((r) => r.gameTeam.result));

  const response: HeroWinRateResponse = {
    hero: hero as Hero,
    ...stats,
  };

  return NextResponse.json(response);
}

function isValidHero(hero: string): hero is Hero {
  return Object.values(Hero).includes(hero as Hero);
}

function calculateGameStats(results: GameResult[]) {
  const totalGames = results.length;
  const wins = results.filter((r) => r === GameResult.WIN).length;
  const losses = results.filter((r) => r === GameResult.LOSE).length;
  const draws = results.filter((r) => r === GameResult.DRAW).length;

  return {
    totalGames,
    wins,
    losses,
    draws,
    winRate: calculateWinRate(wins, totalGames),
  };
}
