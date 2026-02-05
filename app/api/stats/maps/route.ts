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

/**
 * 맵별 플레이어 승률 조회
 * GET /api/stats/maps
 */
export async function GET(): Promise<NextResponse<MapPlayerWinRateResponse[]>> {
  const gameParticipations = await prisma.gameTeamMember.findMany({
    select: {
      playerId: true,
      player: {
        select: {
          name: true,
          nickname: true,
        },
      },
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

  const mapStats = aggregateMapPlayerStats(gameParticipations);

  // 맵 이름 순으로 정렬
  return NextResponse.json(
    Array.from(mapStats.entries())
      .map(([map, playerStats]) => ({
        map,
        playerStats: Array.from(playerStats.values()).sort((a, b) => b.totalGames - a.totalGames),
      }))
      .sort((a, b) => a.map.localeCompare(b.map)),
  );
}

type GameParticipation = {
  playerId: string;
  player: {
    name: string;
    nickname: string;
  };
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
): Map<GameMap, Map<string, PlayerWinRateResponse>> {
  const mapStats = new Map<GameMap, Map<string, PlayerStatsAccumulator>>();

  for (const participation of participations) {
    const map = participation.gameTeam.game.map;
    const playerId = participation.playerId;

    if (!mapStats.has(map)) {
      mapStats.set(map, new Map());
    }

    const playerMap = mapStats.get(map)!;

    if (!playerMap.has(playerId)) {
      playerMap.set(playerId, {
        playerId,
        playerName: participation.player.name,
        playerNickname: participation.player.nickname,
        stats: createResultCounts(),
      });
    }

    const playerStats = playerMap.get(playerId)!;
    updateCountsByResult(playerStats.stats, participation.gameTeam.result);
  }

  // 최종 WinRateResponse로 변환
  const result = new Map<GameMap, Map<string, PlayerWinRateResponse>>();

  for (const [map, playerMap] of mapStats.entries()) {
    const convertedMap = new Map<string, PlayerWinRateResponse>();

    for (const [playerId, stats] of playerMap.entries()) {
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
