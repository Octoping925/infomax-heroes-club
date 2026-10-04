import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { isValidHero } from "@/domain/hots/service/hero-service";
import { HeroWinRateResponse } from "@/app/api/stats/types";
import { buildWinRateStatsFromResults } from "@/app/api/stats/utils/stats";

type RouteParams = {
  params: Promise<{ hero: string }>;
};

/**
 * 특정 영웅의 통산 승률 조회
 * GET /api/stats/heroes/[hero]
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
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

  const stats = buildWinRateStatsFromResults(gameResults.map((r) => r.gameTeam.result));

  return NextResponse.json({ hero, ...stats });
}
