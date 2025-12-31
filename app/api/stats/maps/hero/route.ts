import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameMap, GameResult, Hero } from "@/generated/prisma/client";
import {
  HeroWinRateResponse,
  MapHeroWinRateResponse,
} from "@/app/api/stats/types";
import { calculateWinRate } from "@/utils/win-rate";

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
    Array.from(mapStats.entries())
      .map(([map, heroStats]) => ({
        map,
        heroStats: Array.from(heroStats.values()).sort(
          (a, b) => b.totalGames - a.totalGames
        ),
      }))
      .sort((a, b) => a.map.localeCompare(b.map))
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
  wins: number;
  losses: number;
  draws: number;
};

function aggregateMapHeroStats(
  participations: GameParticipation[]
): Map<GameMap, Map<Hero, HeroWinRateResponse>> {
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
        wins: 0,
        losses: 0,
        draws: 0,
      });
    }

    const heroStats = heroMap.get(hero)!;
    const result: GameResult = participation.gameTeam.result;

    if (result === GameResult.WIN) {
      heroStats.wins++;
      continue;
    }

    if (result === GameResult.LOSE) {
      heroStats.losses++;
      continue;
    }

    heroStats.draws++;
  }

  const result = new Map<GameMap, Map<Hero, HeroWinRateResponse>>();

  for (const [map, heroMap] of mapStats.entries()) {
    const convertedMap = new Map<Hero, HeroWinRateResponse>();

    for (const [hero, stats] of heroMap.entries()) {
      convertedMap.set(hero, {
        hero: stats.hero,
        totalGames: stats.wins + stats.losses + stats.draws,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        winRate: calculateWinRate(stats.wins, stats.losses, stats.draws),
      });
    }

    result.set(map, convertedMap);
  }

  return result;
}
