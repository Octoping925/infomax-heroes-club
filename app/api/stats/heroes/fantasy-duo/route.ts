import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { HeroDuoWinRateResponse } from "@/app/api/stats/types";
import { parseClampedIntegerParam } from "@/app/api/stats/utils/query";
import { buildWinRateStatsFromCounts, calculateTotalGames, updateCountsByResult } from "@/app/api/stats/utils/stats";
import { Hero } from "@/domain/hots/models";

type DuoAccumulator = {
  readonly heroA: Hero;
  readonly heroB: Hero;
  wins: number;
  losses: number;
  draws: number;
};

const DEFAULT_LIMIT = 50;
const DEFAULT_MIN_GAMES = 5;
const MAX_LIMIT = 200;

/**
 * 같이 플레이했을 때 승률이 좋은 영웅 쌍(같은 팀) 랭킹 조회 (게임 단위)
 * GET /api/stats/heroes/fantasy-duo?minCount=5&limit=50
 *
 * - 같은 GameTeam(같은 팀) 안에서 함께 나온 영웅 2개 조합을 집계합니다.
 * - gameTeam.result 기준으로 승/패/무를 계산합니다.
 */
export async function GET(req: Request): Promise<NextResponse<HeroDuoWinRateResponse[]>> {
  const { limit, minCount } = parseQueryParams(req.url);

  const gameTeams = await prisma.gameTeam.findMany({
    select: {
      result: true,
      members: {
        select: {
          hero: true,
        },
      },
    },
  });

  const duoMap = new Map<string, DuoAccumulator>();

  for (const gameTeam of gameTeams) {
    const uniqueHeroes = Array.from(new Set<Hero>(gameTeam.members.map((m) => m.hero))).sort((a, b) =>
      a.localeCompare(b),
    );

    if (uniqueHeroes.length < 2) {
      continue;
    }

    const result = gameTeam.result;

    for (let i = 0; i < uniqueHeroes.length - 1; i++) {
      for (let j = i + 1; j < uniqueHeroes.length; j++) {
        const heroA = uniqueHeroes[i];
        const heroB = uniqueHeroes[j];
        if (!heroA || !heroB) {
          continue;
        }

        const duoKey = buildDuoKey(heroA, heroB);
        const current =
          duoMap.get(duoKey) ??
          createAccumulator({
            heroA,
            heroB,
          });

        updateCountsByResult(current, result);
        duoMap.set(duoKey, current);
      }
    }
  }

  const response: HeroDuoWinRateResponse[] = Array.from(duoMap.values())
    .map((acc) => {
      const stats = buildWinRateStatsFromCounts(acc);
      return {
        heroA: acc.heroA,
        heroB: acc.heroB,
        totalGames: calculateTotalGames(acc),
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        winRate: stats.winRate,
      };
    })
    .filter((item) => item.totalGames >= minCount)
    .sort((a, b) => b.winRate - a.winRate || b.totalGames - a.totalGames)
    .slice(0, limit);

  return NextResponse.json(response);
}

function parseQueryParams(url: string): {
  readonly limit: number;
  readonly minCount: number;
} {
  const { searchParams } = new URL(url);
  const limit = parseClampedIntegerParam(searchParams, {
    keys: ["limit"],
    min: 1,
    max: MAX_LIMIT,
    fallback: DEFAULT_LIMIT,
  });
  const minCount = parseClampedIntegerParam(searchParams, {
    keys: ["minCount"],
    min: 1,
    max: 10_000,
    fallback: DEFAULT_MIN_GAMES,
  });

  return { limit, minCount };
}

function buildDuoKey(heroA: Hero, heroB: Hero): string {
  return `${heroA}:${heroB}`;
}

function createAccumulator(input: { heroA: Hero; heroB: Hero }): DuoAccumulator {
  return {
    heroA: input.heroA,
    heroB: input.heroB,
    wins: 0,
    losses: 0,
    draws: 0,
  };
}
