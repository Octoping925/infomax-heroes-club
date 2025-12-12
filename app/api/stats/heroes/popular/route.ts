import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult, Hero } from "@/generated/prisma/client";
import {
  HeroPopularityResponse,
  calculateWinRate,
} from "@/app/api/stats/types";

/**
 * 밴/픽이 많이 된 영웅 통계 조회
 * GET /api/stats/heroes/popular
 */
export async function GET(): Promise<NextResponse<HeroPopularityResponse[]>> {
  const [pickStats, banCounts] = await Promise.all([
    fetchPickStats(),
    fetchBanCounts(),
  ]);

  const heroPopularity = buildHeroPopularity(pickStats, banCounts);

  // 총 등장 횟수(픽 + 밴) 순으로 정렬
  return NextResponse.json(
    heroPopularity.sort((a, b) => b.totalAppearance - a.totalAppearance)
  );
}

type PickStat = {
  hero: Hero;
  result: GameResult;
};

async function fetchPickStats(): Promise<PickStat[]> {
  const picks = await prisma.gameTeamMember.findMany({
    select: {
      hero: true,
      gameTeam: {
        select: {
          result: true,
        },
      },
    },
  });

  return picks.map((pick) => ({
    hero: pick.hero,
    result: pick.gameTeam.result,
  }));
}

async function fetchBanCounts(): Promise<Map<Hero, number>> {
  const bans = await prisma.gameTeamBan.groupBy({
    by: ["hero"],
    _count: {
      hero: true,
    },
  });

  const banMap = new Map<Hero, number>();
  for (const ban of bans) {
    banMap.set(ban.hero, ban._count.hero);
  }

  return banMap;
}

function buildHeroPopularity(
  pickStats: PickStat[],
  banCounts: Map<Hero, number>
): HeroPopularityResponse[] {
  // 영웅별 픽 통계 집계
  const heroPickMap = new Map<Hero, { total: number; wins: number }>();

  for (const pick of pickStats) {
    const current = heroPickMap.get(pick.hero) ?? { total: 0, wins: 0 };
    current.total++;
    if (pick.result === GameResult.WIN) {
      current.wins++;
    }
    heroPickMap.set(pick.hero, current);
  }

  // 모든 영웅 목록 (픽 또는 밴된 영웅)
  const allHeroes = new Set<Hero>([...heroPickMap.keys(), ...banCounts.keys()]);

  return Array.from(allHeroes).map((hero) => {
    const pickStat = heroPickMap.get(hero) ?? { total: 0, wins: 0 };
    const banCount = banCounts.get(hero) ?? 0;

    return {
      hero,
      pickCount: pickStat.total,
      banCount,
      totalAppearance: pickStat.total + banCount,
      pickWinRate: calculateWinRate(pickStat.wins, pickStat.total),
    };
  });
}
