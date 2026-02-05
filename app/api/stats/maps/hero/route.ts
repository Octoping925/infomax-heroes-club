import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult } from "@/generated/prisma/client";
import { HeroWinRateResponse, MapHeroWinRateResponse } from "@/app/api/stats/types";
import {
  buildWinRateStatsFromCounts,
  createResultCounts,
  ResultCounts,
  updateCountsByResult,
} from "@/app/api/stats/utils/stats";
import { GameMap, Hero } from "@/domain/hots/models";

/**
 * 맵별 영웅 승률 조회
 * GET /api/stats/maps/hero
 */
export async function GET(): Promise<NextResponse<MapHeroWinRateResponse[]>> {
  const gameParticipations = await prisma.gameTeamMember.findMany({
    select: {
      hero: true,
      gameTeam: {
        select: {
          result: true,
          game: {
            select: {
              map: true,
            },
          },
        },
      },
    },
  });

  const mapStats = aggregateMapHeroStats(gameParticipations);

  return NextResponse.json(
    Array.from(mapStats.entries(), ([map, heroStats]) => ({
      map,
      heroStats: Array.from(heroStats.values()).sort((a, b) => b.totalGames - a.totalGames),
    })).sort((a, b) => a.map.localeCompare(b.map)),
  );
}

type GameParticipation = {
  hero: Hero;
  gameTeam: {
    result: GameResult;
    game: {
      map: GameMap;
    };
  };
};

type HeroStatsAccumulator = {
  hero: Hero;
  stats: ResultCounts;
};

function aggregateMapHeroStats(participations: GameParticipation[]): Map<GameMap, Map<Hero, HeroWinRateResponse>> {
  const mapStats = new Map<GameMap, Map<Hero, HeroStatsAccumulator>>();

  for (const participation of participations) {
    const map: GameMap = participation.gameTeam.game.map;
    const hero: Hero = participation.hero;

    if (!mapStats.has(map)) {
      mapStats.set(map, new Map());
    }

    const heroMap = mapStats.get(map)!;

    if (!heroMap.has(hero)) {
      heroMap.set(hero, {
        hero,
        stats: createResultCounts(),
      });
    }

    const heroStats = heroMap.get(hero)!;
    updateCountsByResult(heroStats.stats, participation.gameTeam.result);
  }

  const result = new Map<GameMap, Map<Hero, HeroWinRateResponse>>();

  for (const [map, heroMap] of mapStats.entries()) {
    const convertedMap = new Map<Hero, HeroWinRateResponse>();

    for (const [hero, stats] of heroMap.entries()) {
      const winRateStats = buildWinRateStatsFromCounts(stats.stats);
      convertedMap.set(hero, {
        hero: stats.hero,
        ...winRateStats,
      });
    }

    result.set(map, convertedMap);
  }

  return result;
}
