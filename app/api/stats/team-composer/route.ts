import { TeamComposerResponse, TeamingPairStatResponse, TeamingWindowStats } from "@/app/api/stats/types";
import { fetchPlayerMap } from "@/app/api/stats/utils/player";
import { prisma } from "@/config/prisma";
import { HeroRole, HeroRoles } from "@/domain/hots/models";
import { maxBy, round } from "es-toolkit";
import { NextResponse } from "next/server";
import {
  buildWinRateStatsFromCounts,
  createResultCounts,
  ResultCounts,
  toResultByWinnerTeamNumber,
  updateCountsByResult,
} from "@/app/api/stats/utils/stats";
import { GameResult } from "@/generated/prisma/client";
import { buildPlayedAtYearFilter, parseYearParam } from "@/app/api/stats/utils/query";

const RECENT_MATCH_COUNT = 6;
const ROLE_ORDER = Object.values(HeroRoles);

type PairWindowCounter = {
  encounterMatches: number;
  sameTeamMatches: number;
  sameTeamCounts: ResultCounts;
};

type PairCounter = {
  allTime: PairWindowCounter;
  recent6: PairWindowCounter;
};

type PairTeam = {
  readonly playerIds: ReadonlyArray<string>;
  readonly result: GameResult;
};

type MatchResultCounter = {
  wins: number;
  losses: number;
  draws: number;
  total: number;
};

/**
 * 팀 편성 도우미 데이터 조회
 * GET /api/stats/team-composer
 */
export async function GET(request: Request): Promise<NextResponse<TeamComposerResponse>> {
  const year = parseYearParam(new URL(request.url).searchParams.get("year"));
  const playedAt = buildPlayedAtYearFilter(year);
  const [playerMap, matches, roleRows] = await Promise.all([
    fetchPlayerMap(),
    prisma.match.findMany({
      where: playedAt
        ? {
            playedAt,
          }
        : undefined,
      orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        winnerTeamNumber: true,
        teams: {
          orderBy: {
            teamNumber: "asc",
          },
          select: {
            teamNumber: true,
            members: {
              select: {
                playerId: true,
              },
            },
          },
        },
      },
    }),
    prisma.gameTeamMember.groupBy({
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
      by: ["playerId", "position"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const pairStats = new Map<string, PairCounter>();
  const totalMatchCountByPlayer = new Map<string, number>();
  const allTimeResultByPlayer = new Map<string, MatchResultCounter>();
  const recentResultByPlayer = new Map<string, MatchResultCounter>();
  const recentUsedCountByPlayer = new Map<string, number>();

  for (const match of matches) {
    accumulatePairStats(toPairTeams(match), "allTime", pairStats);

    const uniquePlayerIds = new Set(match.teams.flatMap((team) => team.members.map((member) => member.playerId)));
    for (const playerId of uniquePlayerIds) {
      totalMatchCountByPlayer.set(playerId, (totalMatchCountByPlayer.get(playerId) ?? 0) + 1);
    }

    for (const team of match.teams) {
      const result = toResultByWinnerTeamNumber(match.winnerTeamNumber, team.teamNumber);
      for (const member of team.members) {
        updateMatchResultCounter(allTimeResultByPlayer, member.playerId, result);

        const used = recentUsedCountByPlayer.get(member.playerId) ?? 0;
        if (used < RECENT_MATCH_COUNT) {
          updateMatchResultCounter(recentResultByPlayer, member.playerId, result);
          recentUsedCountByPlayer.set(member.playerId, used + 1);
        }
      }
    }
  }

  for (const recentMatch of matches.slice(0, RECENT_MATCH_COUNT)) {
    accumulatePairStats(toPairTeams(recentMatch), "recent6", pairStats);
  }

  const roleCountByPlayer = new Map<string, Map<HeroRole, number>>();
  for (const row of roleRows) {
    const perPlayer = roleCountByPlayer.get(row.playerId) ?? new Map<HeroRole, number>();
    perPlayer.set(row.position as HeroRole, row._count._all);
    roleCountByPlayer.set(row.playerId, perPlayer);
  }

  const players = Array.from(playerMap.values())
    .toSorted((a, b) => a.nickname.localeCompare(b.nickname))
    .map((player) => {
      const perRoleCount = roleCountByPlayer.get(player.id) ?? new Map<HeroRole, number>();
      const totalGames = perRoleCount.values().reduce((sum, count) => sum + count, 0);

      const roleStats = ROLE_ORDER.map((role) => {
        const games = perRoleCount.get(role) ?? 0;
        const rate = totalGames > 0 ? round((games / totalGames) * 100, 1) : 0;
        return { role, games, rate };
      });

      const primaryRole = maxBy(roleStats, (it) => it.games)!;
      const flexibility = roleStats.filter((role) => role.games >= 3 || role.rate >= 20).length;

      return {
        playerId: player.id,
        playerName: player.name,
        playerNickname: player.nickname,
        totalMatches: totalMatchCountByPlayer.get(player.id) ?? 0,
        allTimeWinRate: calculateWinRate(allTimeResultByPlayer.get(player.id)),
        recentWinRate: calculateWinRate(recentResultByPlayer.get(player.id)),
        recentGames: recentResultByPlayer.get(player.id)?.total ?? 0,
        primaryRole: primaryRole.games > 0 ? primaryRole.role : null,
        flexibility,
        roleStats,
      };
    });

  const pairs = Array.from(pairStats.entries(), ([key, value]) => {
    const [playerAId, playerBId] = key.split("|");
    const allTime = toWindowStats(value.allTime);
    const recent6 = toWindowStats(value.recent6);

    return {
      playerAId,
      playerBId,
      allTime,
      recent6,
    } satisfies TeamingPairStatResponse;
  }).toSorted((a, b) => {
    if (a.playerAId !== b.playerAId) return a.playerAId.localeCompare(b.playerAId);
    return a.playerBId.localeCompare(b.playerBId);
  });

  const defaultCandidateIds = matches[0]
    ? Array.from(new Set(matches[0].teams.flatMap((team) => team.members.map((member) => member.playerId))))
    : [];

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      recentMatchCount: RECENT_MATCH_COUNT,
      defaultCandidateIds,
      players,
      pairs,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}

function toPairTeams(match: {
  readonly winnerTeamNumber: number | null;
  readonly teams: ReadonlyArray<{
    readonly teamNumber: number;
    readonly members: ReadonlyArray<{ readonly playerId: string }>;
  }>;
}): PairTeam[] {
  return match.teams.map((team) => ({
    playerIds: team.members.map((member) => member.playerId),
    result: toResultByWinnerTeamNumber(match.winnerTeamNumber, team.teamNumber),
  }));
}

function accumulatePairStats(
  teams: ReadonlyArray<PairTeam>,
  window: "allTime" | "recent6",
  pairStats: Map<string, PairCounter>,
) {
  const uniquePlayers = Array.from(new Set(teams.flatMap((team) => team.playerIds)));

  for (let i = 0; i < uniquePlayers.length; i += 1) {
    for (let j = i + 1; j < uniquePlayers.length; j += 1) {
      const key = toPairKey(uniquePlayers[i], uniquePlayers[j]);
      const counter = ensurePairCounter(pairStats, key);
      counter[window].encounterMatches += 1;
    }
  }

  for (const team of teams) {
    const uniqueTeam = Array.from(new Set(team.playerIds));
    for (let i = 0; i < uniqueTeam.length; i += 1) {
      for (let j = i + 1; j < uniqueTeam.length; j += 1) {
        const key = toPairKey(uniqueTeam[i], uniqueTeam[j]);
        const counter = ensurePairCounter(pairStats, key);
        counter[window].sameTeamMatches += 1;
        updateCountsByResult(counter[window].sameTeamCounts, team.result);
      }
    }
  }
}

function toPairKey(playerAId: string, playerBId: string): string {
  return playerAId < playerBId ? `${playerAId}|${playerBId}` : `${playerBId}|${playerAId}`;
}

function ensurePairCounter(pairStats: Map<string, PairCounter>, key: string): PairCounter {
  const existing = pairStats.get(key);
  if (existing) {
    return existing;
  }

  const created: PairCounter = {
    allTime: { encounterMatches: 0, sameTeamMatches: 0, sameTeamCounts: createResultCounts() },
    recent6: { encounterMatches: 0, sameTeamMatches: 0, sameTeamCounts: createResultCounts() },
  };
  pairStats.set(key, created);
  return created;
}

function toWindowStats(counter: PairWindowCounter): TeamingWindowStats {
  const sameTeamRate =
    counter.encounterMatches > 0 ? round((counter.sameTeamMatches / counter.encounterMatches) * 100, 1) : 0;
  const sameTeamStats = buildWinRateStatsFromCounts(counter.sameTeamCounts);

  return {
    encounterMatches: counter.encounterMatches,
    sameTeamMatches: counter.sameTeamMatches,
    sameTeamRate,
    sameTeamWins: sameTeamStats.wins,
    sameTeamLosses: sameTeamStats.losses,
    sameTeamDraws: sameTeamStats.draws,
    sameTeamWinRate: sameTeamStats.winRate,
  };
}

function updateMatchResultCounter(
  resultByPlayer: Map<string, MatchResultCounter>,
  playerId: string,
  result: GameResult,
) {
  const counter = resultByPlayer.get(playerId) ?? {
    wins: 0,
    losses: 0,
    draws: 0,
    total: 0,
  };

  updateCountsByResult(counter, result);
  counter.total += 1;

  resultByPlayer.set(playerId, counter);
}

function calculateWinRate(counter: MatchResultCounter | undefined): number {
  if (!counter || counter.total === 0) return 0;
  return round((counter.wins / counter.total) * 100, 1);
}
