import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult, Hero } from "@/generated/prisma/client";
import { HeroWinRateResponse, calculateWinRate } from "@/app/api/stats/types";
import { countBy } from "es-toolkit";

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
    where: { hero: hero },
    select: {
      gameTeam: {
        select: {
          result: true,
        },
      },
    },
  });

  const stats = calculateGameStats(gameResults.map((r) => r.gameTeam.result));

  return NextResponse.json({ hero, ...stats });
}

function isValidHero(hero: string): hero is Hero {
  return Object.values(Hero).includes(hero as Hero);
}

function calculateGameStats(results: GameResult[]) {
  const totalGames = results.length;
  const counts = countBy(results, (r) => r);

  return {
    totalGames,
    wins: counts.WIN,
    losses: counts.LOSE,
    draws: counts.DRAW,
    winRate: calculateWinRate(counts.WIN, totalGames),
  };
}
