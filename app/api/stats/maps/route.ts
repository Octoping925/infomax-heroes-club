import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { GameMap, GameResult } from "@/generated/prisma/client";
import { MapPlayerWinRateResponse, PlayerWinRateResponse } from "@/app/api/stats/types";
import {
  buildWinRateStatsFromCounts,
  createResultCounts,
  ResultCounts,
  updateCountsByResult,
} from "@/app/api/stats/utils/stats";
import { fetchPlayerMap, PlayerMap } from "../utils/player";
import { buildPlayedAtYearFilter, parseYearParam } from "@/app/api/stats/utils/query";

/**
 * 맵별 플레이어 승률 조회
 * GET /api/stats/maps
 */
export async function GET(request: Request): Promise<NextResponse<MapPlayerWinRateResponse[]>> {
  const year = parseYearParam(new URL(request.url).searchParams.get("year"));
  const playedAt = buildPlayedAtYearFilter(year);
  const playerMap = await fetchPlayerMap();
  const gameParticipations = await prisma.gameTeamMember.findMany({
    where: playedAt
      ? {
          gameTeam: {
            game: {
              match: {
                playedAt,
              },
            },
          },
        }
      : undefined,
    select: {
      playerId: true,
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

  const mapStats = aggregateMapPlayerStats(gameParticipations, playerMap);

  // 맵 이름 순으로 정렬
  return NextResponse.json(
    mapStats
      .entries()
      .map(([map, playerStats]) => ({
        map,
        playerStats: Array.from(playerStats.values()).sort((a, b) => b.totalGames - a.totalGames),
      }))
      .toArray()
      .sort((a, b) => a.map.localeCompare(b.map)),
  );
}

type GameParticipation = {
  playerId: string;
  gameTeam: {
    result: GameResult;
    game: {
      map: GameMap;
    };
  };
};

type PlayerStatsAccumulator = {
  playerId: string;
  playerName: string;
  playerNickname: string;
  stats: ResultCounts;
};

function aggregateMapPlayerStats(
  participations: GameParticipation[],
  playerMap: PlayerMap,
): Map<GameMap, Map<string, PlayerWinRateResponse>> {
  const mapStats = new Map<GameMap, Map<string, PlayerStatsAccumulator>>();

  for (const participation of participations) {
    const map = participation.gameTeam.game.map;
    const playerId = participation.playerId;

    if (!mapStats.has(map)) {
      mapStats.set(map, new Map());
    }

    const playerStatsMap = mapStats.get(map)!;

    if (!playerStatsMap.has(playerId)) {
      playerStatsMap.set(playerId, {
        playerId,
        playerName: playerMap.get(playerId)!.name,
        playerNickname: playerMap.get(playerId)!.nickname,
        stats: createResultCounts(),
      });
    }

    const playerStats = playerStatsMap.get(playerId)!;
    updateCountsByResult(playerStats.stats, participation.gameTeam.result);
  }

  // 최종 WinRateResponse로 변환
  const result = new Map<GameMap, Map<string, PlayerWinRateResponse>>();

  for (const [map, playerStatsMap] of mapStats.entries()) {
    const convertedMap = new Map<string, PlayerWinRateResponse>();

    for (const [playerId, stats] of playerStatsMap.entries()) {
      const winRateStats = buildWinRateStatsFromCounts(stats.stats);
      convertedMap.set(playerId, {
        playerId: stats.playerId,
        playerName: stats.playerName,
        playerNickname: stats.playerNickname,
        ...winRateStats,
      });
    }

    result.set(map, convertedMap);
  }

  return result;
}
