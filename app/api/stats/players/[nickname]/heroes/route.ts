import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameResult } from "@/generated/prisma/client";
import { PlayerHeroMapWinRateResponse, PlayerHeroWinRateResponse, HeroWinRateResponse } from "@/app/api/stats/types";
import {
  buildWinRateStatsFromCounts,
  createResultCounts,
  ResultCounts,
  updateCountsByResult,
} from "@/app/api/stats/utils/stats";
import { GameMap, Hero } from "@/domain/hots/models";
import { buildPlayedAtYearFilter, parseYearParam } from "@/app/api/stats/utils/query";

type RouteParams = {
  params: Promise<{ nickname: string }>;
};

/**
 * 특정 플레이어의 영웅별 승률 조회
 * GET /api/stats/players/[nickname]/heroes
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<PlayerHeroWinRateResponse | { error: string }>> {
  const { nickname } = await params;
  const year = parseYearParam(request.nextUrl.searchParams.get("year"));
  const playedAt = buildPlayedAtYearFilter(year);

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
    where: {
      playerId: player.id,
      ...(playedAt
        ? {
            gameTeam: {
              game: {
                match: {
                  playedAt,
                },
              },
            },
          }
        : {}),
    },
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

  const heroStats = aggregateHeroStats(gameResults);
  const heroStatsByMap = aggregateHeroStatsByMap(gameResults);

  const response: PlayerHeroWinRateResponse = {
    playerId: player.id,
    playerName: player.name,
    playerNickname: player.nickname,
    heroStats,
    heroStatsByMap,
  };

  return NextResponse.json(response);
}

type GameResultWithHero = {
  hero: Hero;
  gameTeam: {
    result: GameResult;
    game: {
      map: GameMap;
    };
  };
};

function aggregateHeroStats(results: GameResultWithHero[]): HeroWinRateResponse[] {
  const heroMap = new Map<Hero, ResultCounts>();

  for (const result of results) {
    const current = heroMap.get(result.hero) ?? createResultCounts();
    updateCountsByResult(current, result.gameTeam.result);
    heroMap.set(result.hero, current);
  }

  return Array.from(heroMap.entries(), ([hero, stats]) => ({
    hero,
    ...buildWinRateStatsFromCounts(stats),
  })).toSorted((a, b) => b.totalGames - a.totalGames);
}

function aggregateHeroStatsByMap(results: GameResultWithHero[]): PlayerHeroMapWinRateResponse[] {
  const mapHeroStats = new Map<GameMap, Map<Hero, ResultCounts>>();

  for (const result of results) {
    const map = result.gameTeam.game.map;
    const currentMapStats = mapHeroStats.get(map) ?? new Map<Hero, ResultCounts>();
    const currentHeroStats = currentMapStats.get(result.hero) ?? createResultCounts();

    updateCountsByResult(currentHeroStats, result.gameTeam.result);
    currentMapStats.set(result.hero, currentHeroStats);
    mapHeroStats.set(map, currentMapStats);
  }

  return Array.from(mapHeroStats.entries(), ([map, heroStats]) => ({
    map,
    heroStats: Array.from(heroStats.entries(), ([hero, stats]) => ({
      hero,
      ...buildWinRateStatsFromCounts(stats),
    })).toSorted((a, b) => b.totalGames - a.totalGames),
  })).toSorted((a, b) => a.map.localeCompare(b.map));
}
