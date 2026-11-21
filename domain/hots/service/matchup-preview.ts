import { calculateGameResult } from "@/domain/hots/service/match/common";
import { buildWinRateStatsFromCounts, createResultCounts, updateCountsByResult } from "@/app/api/stats/utils/stats";
import type { WinRateStats } from "@/app/api/stats/types";
import { HERO_CATALOG } from "@/domain/hots/constants";
import { GameResult, Hero, HeroRole } from "@/domain/hots/models";
import type { MatchType, PrismaClient } from "@/generated/prisma/client";
import { groupBy, meanBy, round, uniq } from "es-toolkit";

const MAX_TEAM_SIZE = 5;
const RECENT_FORM_GAMES = 8;
const ROLE_ORDER: readonly HeroRole[] = Object.values(HeroRole);

export interface MatchupPreviewRequest {
  readonly teamANicknames: ReadonlyArray<string>;
  readonly teamBNicknames: ReadonlyArray<string>;
  readonly matchType?: MatchType;
  readonly leaderANickname?: string | null;
  readonly leaderBNickname?: string | null;
}

export interface MatchupPlayerHeroChip {
  readonly hero: Hero;
  readonly games: number;
  readonly winRate: number;
}

export interface MatchupPlayerCard {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly isLeader: boolean;
  readonly primaryRole: HeroRole | null;
  readonly overallStats: WinRateStats;
  readonly recentStats: WinRateStats;
  readonly matchTypeStats: WinRateStats;
  readonly topHeroes: ReadonlyArray<MatchupPlayerHeroChip>;
}

export interface MatchupRoleCoverage {
  readonly role: HeroRole;
  readonly count: number;
  readonly players: ReadonlyArray<string>;
}

export interface MatchupSynergyHighlight {
  readonly playerA: string;
  readonly playerB: string;
  readonly sameTeamMatches: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: number;
}

export interface MatchupLeaderStat {
  readonly nickname: string;
  readonly name: string;
  readonly matchesAsLeader: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: number;
}

export interface MatchupTeamSummary {
  readonly label: "A" | "B";
  readonly roster: ReadonlyArray<MatchupPlayerCard>;
  readonly averageOverallWinRate: number;
  readonly averageRecentWinRate: number;
  readonly averageMatchTypeWinRate: number;
  readonly averageSynergyWinRate: number | null;
  readonly roleCoverage: ReadonlyArray<MatchupRoleCoverage>;
  readonly missingRoles: ReadonlyArray<HeroRole>;
  readonly bestDuo: MatchupSynergyHighlight | null;
  readonly jinxDuo: MatchupSynergyHighlight | null;
  readonly leaderStat: MatchupLeaderStat | null;
}

export interface MatchupRivalryRow {
  readonly teamANickname: string;
  readonly teamBNickname: string;
  readonly matches: number;
  readonly teamAWins: number;
  readonly teamBWins: number;
  readonly draws: number;
  readonly teamAWinRate: number;
}

export type MatchupStorylineKind = "REMATCH" | "RIVALRY" | "DUO_HOT" | "DUO_JINX" | "MATCH_TYPE" | "LEADER";

export interface MatchupStoryline {
  readonly kind: MatchupStorylineKind;
  readonly badge: string;
  readonly title: string;
  readonly detail: string;
}

export interface MatchupWinProbability {
  readonly teamA: number;
  readonly teamB: number;
  readonly factors: ReadonlyArray<{
    readonly label: string;
    readonly teamAEdge: number;
  }>;
}

export interface MatchupPreviewResponse {
  readonly generatedAt: string;
  readonly matchType: MatchType;
  readonly probability: MatchupWinProbability;
  readonly enteredRosterStats: WinRateStats;
  readonly storylines: ReadonlyArray<MatchupStoryline>;
  readonly teamA: MatchupTeamSummary;
  readonly teamB: MatchupTeamSummary;
  readonly rivalries: ReadonlyArray<MatchupRivalryRow>;
}

export class MatchupPreviewError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MatchupPreviewError";
    this.status = status;
  }
}

type SelectedPlayer = {
  readonly id: string;
  readonly name: string;
  readonly nickname: string;
};

type PlayerGameRow = {
  readonly playerId: string;
  readonly hero: Hero;
  readonly position: HeroRole;
  readonly gameTeam: {
    readonly result: GameResult;
    readonly game: {
      readonly match: {
        readonly type: MatchType;
        readonly playedAt: Date;
      };
    };
  };
};

type MatchRow = {
  readonly id: string;
  readonly type: MatchType;
  readonly playedAt: Date;
  readonly winnerTeamNumber: number | null;
  readonly teams: ReadonlyArray<{
    readonly teamNumber: number;
    readonly leaderId: string;
    readonly members: ReadonlyArray<{
      readonly playerId: string;
    }>;
  }>;
};

export async function buildMatchupPreview(
  prisma: PrismaClient,
  input: MatchupPreviewRequest,
): Promise<MatchupPreviewResponse> {
  const teamANicknames = normalizeTeamNicknames(input.teamANicknames, "A팀");
  const teamBNicknames = normalizeTeamNicknames(input.teamBNicknames, "B팀");
  const matchType: MatchType = input.matchType === "DINNER" ? "DINNER" : "LUNCH";

  const overlap = teamANicknames.filter((nickname) => teamBNicknames.includes(nickname));
  if (overlap.length > 0) {
    throw new MatchupPreviewError(`같은 플레이어가 양 팀에 중복 포함되어 있습니다: ${overlap.join(", ")}`);
  }

  const allNicknames = [...teamANicknames, ...teamBNicknames];
  const players = await prisma.player.findMany({
    where: {
      nickname: {
        in: allNicknames,
      },
    },
    select: {
      id: true,
      name: true,
      nickname: true,
    },
  });

  const playerByNickname = new Map(players.map((player) => [player.nickname, player]));
  const missing = allNicknames.filter((nickname) => !playerByNickname.has(nickname));
  if (missing.length > 0) {
    throw new MatchupPreviewError(`존재하지 않는 플레이어입니다: ${missing.join(", ")}`, 404);
  }

  const teamAPlayers = teamANicknames.map((nickname) => playerByNickname.get(nickname)!);
  const teamBPlayers = teamBNicknames.map((nickname) => playerByNickname.get(nickname)!);
  const allPlayerIds = [...teamAPlayers, ...teamBPlayers].map((player) => player.id);

  const [gameRows, relatedMatches] = await Promise.all([
    prisma.gameTeamMember.findMany({
      where: {
        playerId: {
          in: allPlayerIds,
        },
      },
      select: {
        playerId: true,
        hero: true,
        position: true,
        gameTeam: {
          select: {
            result: true,
            game: {
              select: {
                match: {
                  select: {
                    type: true,
                    playedAt: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          gameTeam: {
            game: {
              match: {
                playedAt: "desc",
              },
            },
          },
        },
        {
          gameTeam: {
            game: {
              gameNumber: "desc",
            },
          },
        },
      ],
    }),
    prisma.match.findMany({
      where: {
        teams: {
          some: {
            members: {
              some: {
                playerId: {
                  in: allPlayerIds,
                },
              },
            },
          },
        },
      },
      orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        type: true,
        playedAt: true,
        winnerTeamNumber: true,
        teams: {
          orderBy: {
            teamNumber: "asc",
          },
          select: {
            teamNumber: true,
            leaderId: true,
            members: {
              select: {
                playerId: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const rowsByPlayer = groupBy(gameRows, (row) => row.playerId);

  const leaderANickname =
    input.leaderANickname && teamANicknames.includes(input.leaderANickname) ? input.leaderANickname : null;
  const leaderBNickname =
    input.leaderBNickname && teamBNicknames.includes(input.leaderBNickname) ? input.leaderBNickname : null;

  const teamA = buildTeamSummary({
    label: "A",
    players: teamAPlayers,
    rowsByPlayer,
    matches: relatedMatches,
    matchType,
    preferredLeaderNickname: leaderANickname,
  });

  const teamB = buildTeamSummary({
    label: "B",
    players: teamBPlayers,
    rowsByPlayer,
    matches: relatedMatches,
    matchType,
    preferredLeaderNickname: leaderBNickname,
  });

  const { enteredRosterStats, rivalries, headToHeadEdge } = buildCrossTeamStats(
    teamAPlayers,
    teamBPlayers,
    relatedMatches,
  );

  const probability = calculateWinProbability({
    teamA,
    teamB,
    headToHeadEdge,
    matchType,
  });

  const storylines = buildStorylines({
    matchType,
    enteredRosterStats,
    teamA,
    teamB,
    rivalries,
  });

  return {
    generatedAt: new Date().toISOString(),
    matchType,
    probability,
    enteredRosterStats,
    storylines,
    teamA,
    teamB,
    rivalries,
  };
}

function normalizeTeamNicknames(values: ReadonlyArray<string>, label: string): string[] {
  const trimmed = values.map((value) => value.trim()).filter(Boolean);
  const unique = uniq(trimmed);

  if (unique.length === 0) {
    throw new MatchupPreviewError(`${label} 멤버를 1명 이상 선택해주세요.`);
  }

  if (unique.length > MAX_TEAM_SIZE) {
    throw new MatchupPreviewError(`${label}은 최대 ${MAX_TEAM_SIZE}명까지 선택할 수 있습니다.`);
  }

  if (unique.length !== trimmed.length) {
    throw new MatchupPreviewError(`${label}에 중복된 플레이어가 있습니다.`);
  }

  return unique;
}

function buildTeamSummary(input: {
  label: "A" | "B";
  players: ReadonlyArray<SelectedPlayer>;
  rowsByPlayer: Record<string, PlayerGameRow[]>;
  matches: ReadonlyArray<MatchRow>;
  matchType: MatchType;
  preferredLeaderNickname: string | null;
}): MatchupTeamSummary {
  const leaderStatsByPlayerId = computeLeaderStats(input.players, input.matches);

  const chosenLeader = (() => {
    if (input.preferredLeaderNickname) {
      const explicit = input.players.find((p) => p.nickname === input.preferredLeaderNickname);
      if (explicit) {
        return leaderStatsByPlayerId.get(explicit.id) ?? null;
      }
    }
    const candidates = Array.from(leaderStatsByPlayerId.values())
      .filter((stat) => stat.matchesAsLeader > 0)
      .toSorted((left, right) => right.matchesAsLeader - left.matchesAsLeader || right.winRate - left.winRate);
    return candidates[0] ?? null;
  })();

  const roster: MatchupPlayerCard[] = input.players.map((player) => {
    const rows = input.rowsByPlayer[player.id] ?? [];
    const overallCounts = createResultCounts();
    const recentCounts = createResultCounts();
    const matchTypeCounts = createResultCounts();
    const roleCounts = new Map<HeroRole, number>();
    const heroCounts = new Map<Hero, ReturnType<typeof createResultCounts>>();

    for (const row of rows) {
      updateCountsByResult(overallCounts, row.gameTeam.result);
      roleCounts.set(row.position, (roleCounts.get(row.position) ?? 0) + 1);

      if (row.gameTeam.game.match.type === input.matchType) {
        updateCountsByResult(matchTypeCounts, row.gameTeam.result);
      }

      const perHero = heroCounts.get(row.hero) ?? createResultCounts();
      updateCountsByResult(perHero, row.gameTeam.result);
      heroCounts.set(row.hero, perHero);
    }

    for (const row of rows.slice(0, RECENT_FORM_GAMES)) {
      updateCountsByResult(recentCounts, row.gameTeam.result);
    }

    const primaryRole =
      Array.from(roleCounts.entries()).toSorted((left, right) => right[1] - left[1])[0]?.[0] ?? null;

    const topHeroes: MatchupPlayerHeroChip[] = Array.from(heroCounts.entries(), ([hero, counts]) => {
      const stats = buildWinRateStatsFromCounts(counts);
      return {
        hero,
        games: stats.totalGames,
        winRate: stats.winRate,
      };
    })
      .filter((item) => item.hero in HERO_CATALOG)
      .toSorted((left, right) => right.games - left.games || right.winRate - left.winRate)
      .slice(0, 2);

    return {
      playerId: player.id,
      playerName: player.name,
      playerNickname: player.nickname,
      isLeader: input.preferredLeaderNickname === player.nickname,
      primaryRole,
      overallStats: buildWinRateStatsFromCounts(overallCounts),
      recentStats: buildWinRateStatsFromCounts(recentCounts),
      matchTypeStats: buildWinRateStatsFromCounts(matchTypeCounts),
      topHeroes,
    };
  });

  const qualifiedOverall = roster.filter((player) => player.overallStats.totalGames > 0);
  const qualifiedRecent = roster.filter((player) => player.recentStats.totalGames > 0);
  const qualifiedType = roster.filter((player) => player.matchTypeStats.totalGames > 0);

  const averageOverallWinRate =
    qualifiedOverall.length > 0 ? round(meanBy(qualifiedOverall, (p) => p.overallStats.winRate), 1) : 50;
  const averageRecentWinRate =
    qualifiedRecent.length > 0 ? round(meanBy(qualifiedRecent, (p) => p.recentStats.winRate), 1) : averageOverallWinRate;
  const averageMatchTypeWinRate =
    qualifiedType.length > 0 ? round(meanBy(qualifiedType, (p) => p.matchTypeStats.winRate), 1) : averageOverallWinRate;

  const roleCoverage: MatchupRoleCoverage[] = ROLE_ORDER.map((role) => {
    const specialists = roster.filter((player) => player.primaryRole === role).map((player) => player.playerNickname);
    return {
      role,
      count: specialists.length,
      players: specialists,
    };
  });

  const missingRoles = roleCoverage.filter((item) => item.count === 0).map((item) => item.role);

  const pairHighlights = computeTeamSynergies(input.players, input.matches);
  const qualifiedPairs = pairHighlights.filter((pair) => pair.sameTeamMatches >= 2);
  const bestDuo =
    qualifiedPairs
      .filter((pair) => pair.winRate >= 55)
      .toSorted((left, right) => right.winRate - left.winRate || right.sameTeamMatches - left.sameTeamMatches)[0] ??
    null;
  const jinxDuo =
    qualifiedPairs
      .filter((pair) => pair.winRate <= 45)
      .toSorted((left, right) => left.winRate - right.winRate || right.sameTeamMatches - left.sameTeamMatches)[0] ??
    null;

  const averageSynergyWinRate =
    qualifiedPairs.length > 0 ? round(meanBy(qualifiedPairs, (pair) => pair.winRate), 1) : null;

  return {
    label: input.label,
    roster,
    averageOverallWinRate,
    averageRecentWinRate,
    averageMatchTypeWinRate,
    averageSynergyWinRate,
    roleCoverage,
    missingRoles,
    bestDuo,
    jinxDuo: bestDuo && jinxDuo && bestDuo.playerA === jinxDuo.playerA && bestDuo.playerB === jinxDuo.playerB ? null : jinxDuo,
    leaderStat: chosenLeader,
  };
}

function computeLeaderStats(
  players: ReadonlyArray<SelectedPlayer>,
  matches: ReadonlyArray<MatchRow>,
): Map<string, MatchupLeaderStat> {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const countsByPlayer = new Map<string, ReturnType<typeof createResultCounts>>();

  for (const player of players) {
    countsByPlayer.set(player.id, createResultCounts());
  }

  for (const match of matches) {
    for (const team of match.teams) {
      if (!playerMap.has(team.leaderId)) continue;
      const counts = countsByPlayer.get(team.leaderId)!;
      updateCountsByResult(counts, calculateGameResult(team.teamNumber, match.winnerTeamNumber));
    }
  }

  const result = new Map<string, MatchupLeaderStat>();
  for (const player of players) {
    const counts = countsByPlayer.get(player.id)!;
    const stats = buildWinRateStatsFromCounts(counts);
    result.set(player.id, {
      nickname: player.nickname,
      name: player.name,
      matchesAsLeader: stats.totalGames,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate: stats.winRate,
    });
  }
  return result;
}

function computeTeamSynergies(
  players: ReadonlyArray<SelectedPlayer>,
  matches: ReadonlyArray<MatchRow>,
): MatchupSynergyHighlight[] {
  const acc = new Map<
    string,
    {
      playerA: string;
      playerB: string;
      counts: ReturnType<typeof createResultCounts>;
    }
  >();

  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const a = players[i];
      const b = players[j];
      acc.set(`${a.id}:${b.id}`, {
        playerA: a.nickname,
        playerB: b.nickname,
        counts: createResultCounts(),
      });
    }
  }

  for (const match of matches) {
    const teamByPlayer = getTeamNumberByPlayerId(match);
    for (let i = 0; i < players.length; i += 1) {
      for (let j = i + 1; j < players.length; j += 1) {
        const a = players[i];
        const b = players[j];
        const teamA = teamByPlayer.get(a.id);
        const teamB = teamByPlayer.get(b.id);
        if (!teamA || !teamB || teamA !== teamB) continue;

        const entry = acc.get(`${a.id}:${b.id}`)!;
        updateCountsByResult(entry.counts, calculateGameResult(teamA, match.winnerTeamNumber));
      }
    }
  }

  return Array.from(acc.values(), (entry) => {
    const stats = buildWinRateStatsFromCounts(entry.counts);
    return {
      playerA: entry.playerA,
      playerB: entry.playerB,
      sameTeamMatches: stats.totalGames,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate: stats.winRate,
    };
  }).filter((item) => item.sameTeamMatches > 0);
}

function buildCrossTeamStats(
  teamAPlayers: ReadonlyArray<SelectedPlayer>,
  teamBPlayers: ReadonlyArray<SelectedPlayer>,
  matches: ReadonlyArray<MatchRow>,
): {
  enteredRosterStats: WinRateStats;
  rivalries: MatchupRivalryRow[];
  headToHeadEdge: number;
} {
  const enteredCounts = createResultCounts();
  const teamAIds = new Set(teamAPlayers.map((p) => p.id));
  const teamBIds = new Set(teamBPlayers.map((p) => p.id));

  const pairMap = new Map<
    string,
    {
      teamANickname: string;
      teamBNickname: string;
      teamAWins: number;
      teamBWins: number;
      draws: number;
    }
  >();

  for (const match of matches) {
    const teamByPlayer = getTeamNumberByPlayerId(match);
    const teamANum = findContainingTeamNumber(teamAIds, teamByPlayer);
    const teamBNum = findContainingTeamNumber(teamBIds, teamByPlayer);

    if (teamANum && teamBNum && teamANum !== teamBNum) {
      updateCountsByResult(enteredCounts, calculateGameResult(teamANum, match.winnerTeamNumber));
    }

    for (const playerA of teamAPlayers) {
      const aNum = teamByPlayer.get(playerA.id);
      if (!aNum) continue;

      for (const playerB of teamBPlayers) {
        const bNum = teamByPlayer.get(playerB.id);
        if (!bNum || aNum === bNum) continue;

        const key = `${playerA.id}:${playerB.id}`;
        const current = pairMap.get(key) ?? {
          teamANickname: playerA.nickname,
          teamBNickname: playerB.nickname,
          teamAWins: 0,
          teamBWins: 0,
          draws: 0,
        };

        const result = calculateGameResult(aNum, match.winnerTeamNumber);
        if (result === GameResult.WIN) current.teamAWins += 1;
        else if (result === GameResult.LOSE) current.teamBWins += 1;
        else current.draws += 1;

        pairMap.set(key, current);
      }
    }
  }

  const allRivalries: MatchupRivalryRow[] = Array.from(pairMap.values(), (entry) => {
    const total = entry.teamAWins + entry.teamBWins + entry.draws;
    return {
      teamANickname: entry.teamANickname,
      teamBNickname: entry.teamBNickname,
      matches: total,
      teamAWins: entry.teamAWins,
      teamBWins: entry.teamBWins,
      draws: entry.draws,
      teamAWinRate: total > 0 ? round((entry.teamAWins / total) * 100, 1) : 50,
    };
  }).filter((row) => row.matches > 0);

  const qualifiedForEdge = allRivalries.filter((row) => row.matches >= 2);
  const headToHeadEdge =
    qualifiedForEdge.length > 0
      ? round(meanBy(qualifiedForEdge, (row) => row.teamAWinRate - 50) * 2, 1)
      : 0;

  const rivalries = allRivalries
    .toSorted(
      (left, right) =>
        right.matches - left.matches || Math.abs(right.teamAWinRate - 50) - Math.abs(left.teamAWinRate - 50),
    )
    .slice(0, 6);

  return {
    enteredRosterStats: buildWinRateStatsFromCounts(enteredCounts),
    rivalries,
    headToHeadEdge,
  };
}

function calculateWinProbability(input: {
  teamA: MatchupTeamSummary;
  teamB: MatchupTeamSummary;
  headToHeadEdge: number;
  matchType: MatchType;
}): MatchupWinProbability {
  const recentFormEdge = round(input.teamA.averageRecentWinRate - input.teamB.averageRecentWinRate, 1);
  const overallEdge = round(input.teamA.averageOverallWinRate - input.teamB.averageOverallWinRate, 1);
  const matchTypeEdge = round(input.teamA.averageMatchTypeWinRate - input.teamB.averageMatchTypeWinRate, 1);
  const synergyEdge =
    input.teamA.averageSynergyWinRate !== null && input.teamB.averageSynergyWinRate !== null
      ? round(input.teamA.averageSynergyWinRate - input.teamB.averageSynergyWinRate, 1)
      : 0;

  // Weighted composite edge in percentage points (-50 ~ +50), scaled smoothly to 20% ~ 80%
  const compositeEdge =
    recentFormEdge * 0.35 +
    overallEdge * 0.25 +
    synergyEdge * 0.15 +
    input.headToHeadEdge * 0.15 +
    matchTypeEdge * 0.1;

  const rawTeamA = 50 + compositeEdge * 0.55;
  const teamA = round(Math.max(20, Math.min(80, rawTeamA)), 1);
  const teamB = round(100 - teamA, 1);

  const typeLabel = input.matchType === "LUNCH" ? "점심 내전" : "저녁 내전";

  const factors: Array<{ label: string; teamAEdge: number }> = [
    { label: "최근 폼", teamAEdge: recentFormEdge },
    { label: "통산 승률", teamAEdge: overallEdge },
    { label: "맞대결 상성", teamAEdge: input.headToHeadEdge },
    { label: typeLabel, teamAEdge: matchTypeEdge },
  ];

  if (input.teamA.averageSynergyWinRate !== null && input.teamB.averageSynergyWinRate !== null) {
    factors.push({ label: "팀 시너지", teamAEdge: synergyEdge });
  }

  return {
    teamA,
    teamB,
    factors,
  };
}

function buildStorylines(input: {
  matchType: MatchType;
  enteredRosterStats: WinRateStats;
  teamA: MatchupTeamSummary;
  teamB: MatchupTeamSummary;
  rivalries: ReadonlyArray<MatchupRivalryRow>;
}): MatchupStoryline[] {
  const storylines: MatchupStoryline[] = [];

  if (input.enteredRosterStats.totalGames > 0) {
    const s = input.enteredRosterStats;
    storylines.push({
      kind: "REMATCH",
      badge: "리매치",
      title: `완전 동일 로스터 ${s.totalGames + 1}차전 성사`,
      detail: `역대 맞대결 A팀 기준 ${s.wins}승 ${s.losses}패${s.draws > 0 ? ` ${s.draws}무` : ""} (${s.winRate}%)`,
    });
  }

  const standoutRivalry = input.rivalries
    .filter((row) => row.matches >= 3)
    .toSorted(
      (left, right) =>
        Math.abs(right.teamAWinRate - 50) - Math.abs(left.teamAWinRate - 50) || right.matches - left.matches,
    )[0];

  if (standoutRivalry) {
    const diff = Math.abs(standoutRivalry.teamAWinRate - 50);
    if (diff >= 12) {
      const winner =
        standoutRivalry.teamAWinRate > 50 ? standoutRivalry.teamANickname : standoutRivalry.teamBNickname;
      const challenger =
        standoutRivalry.teamAWinRate > 50 ? standoutRivalry.teamBNickname : standoutRivalry.teamANickname;
      const wins = Math.max(standoutRivalry.teamAWins, standoutRivalry.teamBWins);
      const losses = Math.min(standoutRivalry.teamAWins, standoutRivalry.teamBWins);
      storylines.push({
        kind: "RIVALRY",
        badge: "라이벌리",
        title: `${challenger}, ${winner} 상대 설욕전`,
        detail: `통산 맞대결 ${winner} ${wins}승 ${losses}패 우세 (${standoutRivalry.matches}매치)`,
      });
    } else {
      storylines.push({
        kind: "RIVALRY",
        badge: "초접전",
        title: `${standoutRivalry.teamANickname} vs ${standoutRivalry.teamBNickname} 막상막하`,
        detail: `통산 ${standoutRivalry.teamAWins}승 ${standoutRivalry.teamBWins}패 (${standoutRivalry.matches}매치) 팽팽한 라이벌 구도`,
      });
    }
  }

  const hotDuos = [
    input.teamA.bestDuo ? { team: "A팀", duo: input.teamA.bestDuo } : null,
    input.teamB.bestDuo ? { team: "B팀", duo: input.teamB.bestDuo } : null,
  ]
    .filter((item): item is { team: string; duo: MatchupSynergyHighlight } => Boolean(item && item.duo.winRate >= 58))
    .toSorted((left, right) => right.duo.winRate - left.duo.winRate || right.duo.sameTeamMatches - left.duo.sameTeamMatches);

  if (hotDuos[0]) {
    const { team, duo } = hotDuos[0];
    storylines.push({
      kind: "DUO_HOT",
      badge: "환상의 듀오",
      title: `${team} ${duo.playerA} · ${duo.playerB} 재결합`,
      detail: `같은 팀 통산 ${duo.wins}승 ${duo.losses}패 · 승률 ${duo.winRate}% (${duo.sameTeamMatches}매치)`,
    });
  }

  const jinxDuos = [
    input.teamA.jinxDuo ? { team: "A팀", duo: input.teamA.jinxDuo } : null,
    input.teamB.jinxDuo ? { team: "B팀", duo: input.teamB.jinxDuo } : null,
  ]
    .filter((item): item is { team: string; duo: MatchupSynergyHighlight } => Boolean(item && item.duo.sameTeamMatches >= 3))
    .toSorted((left, right) => left.duo.winRate - right.duo.winRate || right.duo.sameTeamMatches - left.duo.sameTeamMatches);

  if (jinxDuos[0]) {
    const { team, duo } = jinxDuos[0];
    storylines.push({
      kind: "DUO_JINX",
      badge: "징크스 도전",
      title: `${team} ${duo.playerA} · ${duo.playerB}, 오늘은 다를까?`,
      detail: `동팀 전적 ${duo.wins}승 ${duo.losses}패 (승률 ${duo.winRate}%) — 징크스 탈출 도전`,
    });
  }

  const typeLabel = input.matchType === "LUNCH" ? "점심 내전" : "저녁 내전";
  const allPlayersWithTeam = [
    ...input.teamA.roster.map((player) => ({ team: "A팀", player })),
    ...input.teamB.roster.map((player) => ({ team: "B팀", player })),
  ];
  const typeSpecialist = allPlayersWithTeam
    .filter((item) => item.player.matchTypeStats.totalGames >= 3 && item.player.matchTypeStats.winRate >= 58)
    .toSorted(
      (left, right) =>
        right.player.matchTypeStats.winRate - left.player.matchTypeStats.winRate ||
        right.player.matchTypeStats.totalGames - left.player.matchTypeStats.totalGames,
    )[0];

  if (typeSpecialist) {
    const p = typeSpecialist.player;
    storylines.push({
      kind: "MATCH_TYPE",
      badge: `${typeLabel} 버프`,
      title: `${typeSpecialist.team} ${p.playerNickname}, ${typeLabel} 강자`,
      detail: `${typeLabel} 통산 승률 ${p.matchTypeStats.winRate}% (${p.matchTypeStats.wins}승 ${p.matchTypeStats.losses}패)`,
    });
  }

  const leaderHighlights = [
    input.teamA.leaderStat ? { team: "A팀", stat: input.teamA.leaderStat } : null,
    input.teamB.leaderStat ? { team: "B팀", stat: input.teamB.leaderStat } : null,
  ].filter((item): item is { team: string; stat: MatchupLeaderStat } => Boolean(item && item.stat.matchesAsLeader >= 2));

  if (leaderHighlights.length > 0 && storylines.length < 5) {
    const topLeader = leaderHighlights.toSorted(
      (left, right) => right.stat.winRate - left.stat.winRate || right.stat.matchesAsLeader - left.stat.matchesAsLeader,
    )[0];
    storylines.push({
      kind: "LEADER",
      badge: "팀장 이력",
      title: `${topLeader.team} 팀장 ${topLeader.stat.nickname} 출격`,
      detail: `역대 팀장 전적 ${topLeader.stat.wins}승 ${topLeader.stat.losses}패 (승률 ${topLeader.stat.winRate}%)`,
    });
  }

  return storylines.slice(0, 5);
}

function getTeamNumberByPlayerId(match: MatchRow): Map<string, number> {
  const result = new Map<string, number>();
  for (const team of match.teams) {
    for (const member of team.members) {
      result.set(member.playerId, team.teamNumber);
    }
  }
  return result;
}

function findContainingTeamNumber(
  playerIds: ReadonlySet<string>,
  teamByPlayerId: ReadonlyMap<string, number>,
): number | null {
  let resolved: number | null = null;
  for (const playerId of playerIds) {
    const teamNumber = teamByPlayerId.get(playerId);
    if (!teamNumber) return null;
    if (resolved === null) {
      resolved = teamNumber;
    } else if (resolved !== teamNumber) {
      return null;
    }
  }
  return resolved;
}
