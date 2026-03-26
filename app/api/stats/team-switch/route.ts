import { NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { TeamSwitchWinRateResponse } from "@/app/api/stats/types";
import {
  buildWinRateStatsFromCounts,
  createResultCounts,
  ResultCounts,
  updateCountsByResult,
} from "@/app/api/stats/utils/stats";
import { GameResult } from "@/generated/prisma/enums";
import { fetchPlayerMap } from "../utils/player";
import { buildPlayedAtYearFilter, parseYearParam } from "@/app/api/stats/utils/query";

/**
 * 매치팀과 다른 게임팀에서 승률이 좋은 사람 조회
 * GET /api/stats/team-switch
 *
 * 초기 편성(MatchTeam)과 다른 팀(GameTeam)에서 뛴 경기의 승률을 비교합니다.
 */
export async function GET(request: Request): Promise<NextResponse<TeamSwitchWinRateResponse[]>> {
  const year = parseYearParam(new URL(request.url).searchParams.get("year"));
  const playedAt = buildPlayedAtYearFilter(year);
  const [players, participations, matchTeamMemberships] = await Promise.all([
    fetchPlayerMap(),
    prisma.gameTeamMember.findMany({
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
            sourceMatchTeamId: true,
            game: {
              select: {
                matchId: true,
              },
            },
          },
        },
      },
    }),
    prisma.matchTeamMember.findMany({
      where: playedAt
        ? {
            matchTeam: {
              match: {
                playedAt,
              },
            },
          }
        : undefined,
      select: {
        playerId: true,
        matchTeam: {
          select: {
            id: true,
            matchId: true,
          },
        },
      },
    }),
  ]);

  const originalTeamMapByPlayer = getOriginalTeamMapByPlayer(matchTeamMemberships);

  const playerStats = getPlayerStats(participations, originalTeamMapByPlayer);

  const results: TeamSwitchWinRateResponse[] = [];

  for (const [, player] of players) {
    const playerStat = playerStats.get(player.id) ?? {
      original: createResultCounts(),
      switched: createResultCounts(),
    };
    const originalTeamStats = buildWinRateStatsFromCounts(playerStat.original);
    if (originalTeamStats.totalGames === 0) {
      continue;
    }
    const switchedTeamStats = buildWinRateStatsFromCounts(playerStat.switched);

    results.push({
      playerId: player.id,
      playerName: player.name,
      playerNickname: player.nickname,
      originalTeamStats,
      switchedTeamStats,
      switchedWinRateDiff: switchedTeamStats.winRate - originalTeamStats.winRate,
    });
  }

  // 팀 변경 시 승률 차이가 높은 순으로 정렬
  return NextResponse.json(
    results.toSorted((a, b) => b.switchedWinRateDiff - a.switchedWinRateDiff),
    {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}

function getOriginalTeamMapByPlayer(
  matchTeamMemberships: {
    playerId: string;
    matchTeam: { id: string; matchId: string };
  }[],
) {
  return matchTeamMemberships.reduce((acc, m) => {
    const perPlayer = acc.get(m.playerId) ?? new Map();

    perPlayer.set(m.matchTeam.matchId, m.matchTeam.id);
    acc.set(m.playerId, perPlayer);
    return acc;
  }, new Map<string, Map<string, string>>());
}

function getPlayerStats(
  participations: {
    playerId: string;
    gameTeam: {
      result: GameResult;
      sourceMatchTeamId: string;
      game: {
        matchId: string;
      };
    };
  }[],
  originalTeamMapByPlayer: Map<string, Map<string, string>>,
) {
  const statsByPlayer = new Map<string, { original: ResultCounts; switched: ResultCounts }>();

  for (const p of participations) {
    const playerId = p.playerId;
    const matchId = p.gameTeam.game.matchId;
    const currentMatchTeamId = p.gameTeam.sourceMatchTeamId;

    const originalMatchTeamId = originalTeamMapByPlayer.get(playerId)?.get(matchId);

    const playerStats = statsByPlayer.get(playerId) ?? {
      original: createResultCounts(),
      switched: createResultCounts(),
    };

    if (originalMatchTeamId === currentMatchTeamId) {
      updateCountsByResult(playerStats.original, p.gameTeam.result);
    } else {
      updateCountsByResult(playerStats.switched, p.gameTeam.result);
    }

    statsByPlayer.set(playerId, playerStats);
  }

  return statsByPlayer;
}
