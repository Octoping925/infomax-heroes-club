import { TeamComposerResponse, TeamingPairStatResponse, TeamingWindowStats } from "@/app/api/stats/types";
import { fetchPlayerMap } from "@/app/api/stats/utils/player";
import { prisma } from "@/config/prisma";
import { HeroRole, HeroRoleMap } from "@/domain/hots/models";
import { NextResponse } from "next/server";

const RECENT_MATCH_COUNT = 5;
const ROLE_ORDER = Object.values(HeroRoleMap);

type PairCounter = {
  allTime: {
    encounterMatches: number;
    sameTeamMatches: number;
  };
  recent5: {
    encounterMatches: number;
    sameTeamMatches: number;
  };
};

/**
 * 팀 편성 도우미 데이터 조회
 * GET /api/stats/team-composer
 */
export async function GET(): Promise<NextResponse<TeamComposerResponse>> {
  const [playerMap, matches, roleRows] = await Promise.all([
    fetchPlayerMap(),
    prisma.match.findMany({
      orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        teams: {
          orderBy: {
            teamNumber: "asc",
          },
          select: {
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
      by: ["playerId", "position"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const pairStats = new Map<string, PairCounter>();
  const totalMatchCountByPlayer = new Map<string, number>();

  for (const match of matches) {
    accumulatePairStats(
      match.teams.map((team) => team.members.map((member) => member.playerId)),
      "allTime",
      pairStats,
    );

    const uniquePlayerIds = new Set(match.teams.flatMap((team) => team.members.map((member) => member.playerId)));
    for (const playerId of uniquePlayerIds) {
      totalMatchCountByPlayer.set(playerId, (totalMatchCountByPlayer.get(playerId) ?? 0) + 1);
    }
  }

  for (const recentMatch of matches.slice(0, RECENT_MATCH_COUNT)) {
    accumulatePairStats(
      recentMatch.teams.map((team) => team.members.map((member) => member.playerId)),
      "recent5",
      pairStats,
    );
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
      const totalGames = Array.from(perRoleCount.values()).reduce((sum, count) => sum + count, 0);

      const roleStats = ROLE_ORDER.map((role) => {
        const games = perRoleCount.get(role) ?? 0;
        const rate = totalGames > 0 ? roundToOne((games / totalGames) * 100) : 0;
        return { role, games, rate };
      });

      const primaryRole = roleStats.toSorted((a, b) => b.games - a.games)[0];
      const flexibility = roleStats.filter((role) => role.games >= 3 || role.rate >= 20).length;

      return {
        playerId: player.id,
        playerName: player.name,
        playerNickname: player.nickname,
        totalMatches: totalMatchCountByPlayer.get(player.id) ?? 0,
        primaryRole: primaryRole.games > 0 ? primaryRole.role : null,
        flexibility,
        roleStats,
      };
    });

  const pairs = Array.from(pairStats.entries())
    .map(([key, value]) => {
      const [playerAId, playerBId] = key.split("|");
      const allTime = toWindowStats(value.allTime);
      const recent5 = toWindowStats(value.recent5);

      return {
        playerAId,
        playerBId,
        allTime,
        recent5,
      } satisfies TeamingPairStatResponse;
    })
    .toSorted((a, b) => {
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

function accumulatePairStats(
  teams: ReadonlyArray<ReadonlyArray<string>>,
  window: "allTime" | "recent5",
  pairStats: Map<string, PairCounter>,
) {
  const uniquePlayers = Array.from(new Set(teams.flat()));

  for (let i = 0; i < uniquePlayers.length; i += 1) {
    for (let j = i + 1; j < uniquePlayers.length; j += 1) {
      const key = toPairKey(uniquePlayers[i], uniquePlayers[j]);
      const counter = ensurePairCounter(pairStats, key);
      counter[window].encounterMatches += 1;
    }
  }

  for (const team of teams) {
    const uniqueTeam = Array.from(new Set(team));
    for (let i = 0; i < uniqueTeam.length; i += 1) {
      for (let j = i + 1; j < uniqueTeam.length; j += 1) {
        const key = toPairKey(uniqueTeam[i], uniqueTeam[j]);
        const counter = ensurePairCounter(pairStats, key);
        counter[window].sameTeamMatches += 1;
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
    allTime: { encounterMatches: 0, sameTeamMatches: 0 },
    recent5: { encounterMatches: 0, sameTeamMatches: 0 },
  };
  pairStats.set(key, created);
  return created;
}

function toWindowStats(counter: { encounterMatches: number; sameTeamMatches: number }): TeamingWindowStats {
  const sameTeamRate =
    counter.encounterMatches > 0 ? roundToOne((counter.sameTeamMatches / counter.encounterMatches) * 100) : 0;
  return {
    encounterMatches: counter.encounterMatches,
    sameTeamMatches: counter.sameTeamMatches,
    sameTeamRate,
  };
}

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}
