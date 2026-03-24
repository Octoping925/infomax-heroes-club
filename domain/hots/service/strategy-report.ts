import type {
  StrategyHeroSummary,
  StrategyHeroRecommendation,
  StrategyMapSummary,
  StrategyMatchupReport,
  StrategyPlayerMatchup,
  StrategyPlayerReport,
  StrategyRecentGameSummary,
  StrategyReportRequest,
  StrategyReportResponse,
  StrategySide,
  StrategySelectedMapPlan,
  StrategyTeamHeroFocus,
  StrategyTeamMapFocus,
  StrategyTeamReport,
  StrategyTeamRoleCoverage,
  StrategyTeamSynergyPair,
} from "@/app/admin/strategy/types";
import {
  buildWinRateStatsFromCounts,
  createResultCounts,
  toResultByWinnerTeamNumber,
  updateCountsByResult,
} from "@/app/api/stats/utils/stats";
import { HERO_CATALOG, MAP_CATALOG } from "@/domain/hots/constants";
import { GameMap, Hero, HeroRole, HeroRoles } from "@/domain/hots/models";
import type { PrismaClient } from "@/generated/prisma/client";
import { GameResult } from "@/generated/prisma/client";
import { round } from "es-toolkit";

const MAX_TEAM_SIZE = 5;
const MAX_SELECTED_MAPS = 5;
const RECENT_FORM_GAMES = 8;
const RECENT_ACTIVITY_GAMES = 5;
const TEAM_LIST_LIMIT = 4;
const MIN_STRATEGY_HERO_GAMES = 3;
const ROLE_ORDER: readonly HeroRole[] = Object.values(HeroRoles);

const ROLE_LABELS: Record<HeroRole, string> = {
  TANKER: "탱커",
  OFFLANER: "투사",
  MAIN_DEALER: "메인 딜러",
  SUB_DEALER: "서브 딜러",
  HEALER: "힐러",
};

type SelectedPlayer = {
  readonly id: string;
  readonly name: string;
  readonly nickname: string;
};

type PlayerGameRow = {
  readonly playerId: string;
  readonly hero: Hero;
  readonly position: HeroRole;
  readonly heroDamage: number;
  readonly dpm: number;
  readonly gameTeam: {
    readonly result: GameResult;
    readonly game: {
      readonly id: string;
      readonly map: GameMap;
      readonly gameNumber: number;
      readonly matchId: string;
      readonly match: {
        readonly playedAt: Date;
      };
    };
  };
};

type MatchRow = {
  readonly id: string;
  readonly playedAt: Date;
  readonly winnerTeamNumber: number | null;
  readonly teams: ReadonlyArray<{
    readonly teamNumber: number;
    readonly members: ReadonlyArray<{
      readonly playerId: string;
    }>;
  }>;
};

type HeroAccumulator = {
  readonly hero: Hero;
  role: HeroRole;
  counts: ReturnType<typeof createResultCounts>;
  totalHeroDamage: number;
  totalDpm: number;
  lastPlayedAt: Date | null;
};

type MapAccumulator = {
  readonly map: GameMap;
  counts: ReturnType<typeof createResultCounts>;
  totalHeroDamage: number;
  totalDpm: number;
  heroCounts: Map<Hero, ReturnType<typeof createResultCounts>>;
};

type PlayerAnalysis = {
  readonly player: SelectedPlayer;
  readonly report: StrategyPlayerReport;
  readonly allHeroStats: ReadonlyArray<StrategyHeroSummary>;
  readonly allMapStats: ReadonlyArray<StrategyMapSummary>;
  readonly mapHeroStatsByMap: ReadonlyMap<GameMap, ReadonlyArray<StrategyHeroSummary>>;
};

type TeamMapMetric = StrategyTeamMapFocus;

type TeamAnalysis = {
  readonly report: StrategyTeamReport;
  readonly mapMetrics: ReadonlyMap<GameMap, TeamMapMetric>;
};

export class StrategyReportError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "StrategyReportError";
    this.status = status;
  }
}

export async function buildStrategyReport(
  prisma: PrismaClient,
  input: StrategyReportRequest,
): Promise<StrategyReportResponse> {
  const allyNicknames = normalizeTeamNicknames(input.allyNicknames, "우리 팀");
  const enemyNicknames = normalizeTeamNicknames(input.enemyNicknames, "상대 팀");
  const selectedMaps = normalizeSelectedMaps(input.selectedMaps);

  const overlap = allyNicknames.filter((nickname) => enemyNicknames.includes(nickname));
  if (overlap.length > 0) {
    throw new StrategyReportError(`같은 플레이어를 양쪽에 동시에 넣을 수 없습니다: ${overlap.join(", ")}`);
  }

  const allNicknames = [...allyNicknames, ...enemyNicknames];
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
  const missingPlayers = allNicknames.filter((nickname) => !playerByNickname.has(nickname));
  if (missingPlayers.length > 0) {
    throw new StrategyReportError(`존재하지 않는 닉네임입니다: ${missingPlayers.join(", ")}`, 404);
  }

  const allyPlayers = allyNicknames.map((nickname) => playerByNickname.get(nickname)!);
  const enemyPlayers = enemyNicknames.map((nickname) => playerByNickname.get(nickname)!);
  const allPlayerIds = [...allyPlayers, ...enemyPlayers].map((player) => player.id);

  const [playerGameRows, relatedMatches] = await Promise.all([
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
        heroDamage: true,
        dpm: true,
        gameTeam: {
          select: {
            result: true,
            game: {
              select: {
                id: true,
                map: true,
                gameNumber: true,
                matchId: true,
                match: {
                  select: {
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
      orderBy: [
        {
          playedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        playedAt: true,
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
  ]);

  const rowsByPlayer = groupRowsByPlayer(playerGameRows);

  const allyPlayerAnalyses = allyPlayers.map((player) =>
    buildPlayerAnalysis(player, rowsByPlayer.get(player.id) ?? []),
  );
  const enemyPlayerAnalyses = enemyPlayers.map((player) =>
    buildPlayerAnalysis(player, rowsByPlayer.get(player.id) ?? []),
  );

  const allyTeam = buildTeamAnalysis("ALLY", allyPlayerAnalyses, relatedMatches);
  const enemyTeam = buildTeamAnalysis("ENEMY", enemyPlayerAnalyses, relatedMatches);

  const matchup = buildMatchupReport({
    allyPlayers,
    enemyPlayers,
    selectedMaps,
    allyTeam,
    enemyTeam,
    allyPlayerAnalyses,
    enemyPlayerAnalyses,
    matches: relatedMatches,
  });

  return {
    generatedAt: new Date().toISOString(),
    allyTeam: allyTeam.report,
    enemyTeam: enemyTeam.report,
    matchup,
  };
}

function normalizeTeamNicknames(values: ReadonlyArray<string>, label: string): string[] {
  const nicknames = values.map((value) => value.trim()).filter(Boolean);

  if (nicknames.length === 0) {
    throw new StrategyReportError(`${label} 멤버를 1명 이상 선택해주세요.`);
  }

  if (nicknames.length > MAX_TEAM_SIZE) {
    throw new StrategyReportError(`${label}은 최대 ${MAX_TEAM_SIZE}명까지 선택할 수 있습니다.`);
  }

  if (new Set(nicknames).size !== nicknames.length) {
    throw new StrategyReportError(`${label}에 중복된 닉네임이 있습니다.`);
  }

  return nicknames;
}

function normalizeSelectedMaps(values: ReadonlyArray<GameMap>): GameMap[] {
  const maps = values.filter((value): value is GameMap => value in MAP_CATALOG);

  if (maps.length === 0) {
    throw new StrategyReportError("분석할 맵을 1개 이상 선택해주세요.");
  }

  if (maps.length > MAX_SELECTED_MAPS) {
    throw new StrategyReportError(`맵은 최대 ${MAX_SELECTED_MAPS}개까지 선택할 수 있습니다.`);
  }

  if (new Set(maps).size !== maps.length) {
    throw new StrategyReportError("중복된 맵이 포함되어 있습니다.");
  }

  return maps;
}

function groupRowsByPlayer(rows: ReadonlyArray<PlayerGameRow>): Map<string, PlayerGameRow[]> {
  const result = new Map<string, PlayerGameRow[]>();

  for (const row of rows) {
    const current = result.get(row.playerId) ?? [];
    current.push(row);
    result.set(row.playerId, current);
  }

  return result;
}

function buildPlayerAnalysis(player: SelectedPlayer, rows: ReadonlyArray<PlayerGameRow>): PlayerAnalysis {
  const overallCounts = createResultCounts();
  const recentCounts = createResultCounts();
  const roleCounts = new Map<HeroRole, number>();
  const heroMap = new Map<Hero, HeroAccumulator>();
  const mapMap = new Map<GameMap, MapAccumulator>();
  const mapHeroMap = new Map<GameMap, Map<Hero, HeroAccumulator>>();

  for (const row of rows) {
    updateCountsByResult(overallCounts, row.gameTeam.result);

    const roleCount = roleCounts.get(row.position) ?? 0;
    roleCounts.set(row.position, roleCount + 1);

    const heroStats = heroMap.get(row.hero) ?? {
      hero: row.hero,
      role: HERO_CATALOG[row.hero]?.role ?? row.position,
      counts: createResultCounts(),
      totalHeroDamage: 0,
      totalDpm: 0,
      lastPlayedAt: null,
    };
    updateCountsByResult(heroStats.counts, row.gameTeam.result);
    heroStats.totalHeroDamage += row.heroDamage;
    heroStats.totalDpm += row.dpm;
    heroStats.lastPlayedAt = row.gameTeam.game.match.playedAt;
    heroMap.set(row.hero, heroStats);

    const mapStats = mapMap.get(row.gameTeam.game.map) ?? {
      map: row.gameTeam.game.map,
      counts: createResultCounts(),
      totalHeroDamage: 0,
      totalDpm: 0,
      heroCounts: new Map<Hero, ReturnType<typeof createResultCounts>>(),
    };
    updateCountsByResult(mapStats.counts, row.gameTeam.result);
    mapStats.totalHeroDamage += row.heroDamage;
    mapStats.totalDpm += row.dpm;

    const perHeroCounts = mapStats.heroCounts.get(row.hero) ?? createResultCounts();
    updateCountsByResult(perHeroCounts, row.gameTeam.result);
    mapStats.heroCounts.set(row.hero, perHeroCounts);
    mapMap.set(row.gameTeam.game.map, mapStats);

    const perMapHeroMap = mapHeroMap.get(row.gameTeam.game.map) ?? new Map<Hero, HeroAccumulator>();
    const perMapHeroStats = perMapHeroMap.get(row.hero) ?? {
      hero: row.hero,
      role: HERO_CATALOG[row.hero]?.role ?? row.position,
      counts: createResultCounts(),
      totalHeroDamage: 0,
      totalDpm: 0,
      lastPlayedAt: null,
    };
    updateCountsByResult(perMapHeroStats.counts, row.gameTeam.result);
    perMapHeroStats.totalHeroDamage += row.heroDamage;
    perMapHeroStats.totalDpm += row.dpm;
    perMapHeroStats.lastPlayedAt = row.gameTeam.game.match.playedAt;
    perMapHeroMap.set(row.hero, perMapHeroStats);
    mapHeroMap.set(row.gameTeam.game.map, perMapHeroMap);
  }

  const recentRows = rows.slice(0, RECENT_FORM_GAMES);
  for (const row of recentRows) {
    updateCountsByResult(recentCounts, row.gameTeam.result);
  }

  const overallStats = buildWinRateStatsFromCounts(overallCounts);
  const recentStats = buildWinRateStatsFromCounts(recentCounts);
  const totalRoleGames = roleCounts.values().reduce((sum, count) => sum + count, 0);

  const roleStats = ROLE_ORDER.map((role) => {
    const games = roleCounts.get(role) ?? 0;
    return {
      role,
      games,
      rate: totalRoleGames > 0 ? round((games / totalRoleGames) * 100, 1) : 0,
    };
  });

  const primaryRole =
    roleStats
      .filter((item) => item.games > 0)
      .toSorted((left, right) => right.games - left.games || right.rate - left.rate)[0]?.role ?? null;

  const allHeroStats = Array.from(heroMap.values(), (heroStats) => toHeroSummary(heroStats)).toSorted(
    compareWinRateWithSample,
  );

  const allMapStats = Array.from(mapMap.values(), (mapStats) => {
    const counts = buildWinRateStatsFromCounts(mapStats.counts);
    return {
      map: mapStats.map,
      averageHeroDamage: counts.totalGames > 0 ? round(mapStats.totalHeroDamage / counts.totalGames, 0) : 0,
      averageDpm: counts.totalGames > 0 ? round(mapStats.totalDpm / counts.totalGames, 1) : 0,
      topHeroes: Array.from(mapStats.heroCounts.entries(), ([hero, heroCounts]) => {
        const winRateStats = buildWinRateStatsFromCounts(heroCounts);
        return {
          hero,
          games: winRateStats.totalGames,
          winRate: winRateStats.winRate,
        };
      })
        .toSorted((left, right) => right.games - left.games || right.winRate - left.winRate)
        .slice(0, 2),
      ...counts,
    } satisfies StrategyMapSummary;
  });

  const qualifiedHeroStats = allHeroStats.filter((item) => item.totalGames >= 2);
  const qualifiedMapStats = allMapStats.filter((item) => item.totalGames >= 2);

  const signatureHeroes = (qualifiedHeroStats.length > 0 ? qualifiedHeroStats : allHeroStats)
    .toSorted(compareWinRateWithSample)
    .slice(0, 3);

  const strongMaps = (qualifiedMapStats.length > 0 ? qualifiedMapStats : allMapStats)
    .toSorted(compareWinRateWithSample)
    .slice(0, 3);

  const weakMaps = (qualifiedMapStats.length > 0 ? qualifiedMapStats : allMapStats)
    .toSorted((left, right) => compareWinRateWithSample(right, left))
    .slice(0, 3);

  const recentGames = rows.slice(0, RECENT_ACTIVITY_GAMES).map((row) => ({
    gameId: row.gameTeam.game.id,
    playedAt: row.gameTeam.game.match.playedAt.toISOString(),
    map: row.gameTeam.game.map,
    hero: row.hero,
    result: row.gameTeam.result,
    dpm: row.dpm,
  })) satisfies ReadonlyArray<StrategyRecentGameSummary>;

  const mapHeroStatsByMap = new Map(
    Array.from(mapHeroMap.entries(), ([map, heroStats]) => [
      map,
      Array.from(heroStats.values(), (item) => toHeroSummary(item)).toSorted(compareWinRateWithSample),
    ]),
  );

  return {
    player,
    report: {
      playerId: player.id,
      playerName: player.name,
      playerNickname: player.nickname,
      overallStats,
      recentStats,
      primaryRole,
      roleStats,
      signatureHeroes,
      strongMaps,
      weakMaps,
      recentGames,
    },
    allHeroStats,
    allMapStats,
    mapHeroStatsByMap,
  };
}

function buildTeamAnalysis(
  side: StrategySide,
  playerAnalyses: ReadonlyArray<PlayerAnalysis>,
  matches: ReadonlyArray<MatchRow>,
): TeamAnalysis {
  const averageOverallWinRate =
    playerAnalyses.length > 0
      ? round(
          playerAnalyses.reduce((sum, analysis) => sum + analysis.report.overallStats.winRate, 0) /
            playerAnalyses.length,
          1,
        )
      : 0;
  const averageRecentWinRate =
    playerAnalyses.length > 0
      ? round(
          playerAnalyses.reduce((sum, analysis) => sum + analysis.report.recentStats.winRate, 0) /
            playerAnalyses.length,
          1,
        )
      : 0;

  const roleCoverage = ROLE_ORDER.map((role) => {
    const specialists = playerAnalyses
      .filter((analysis) => analysis.report.primaryRole === role)
      .map((analysis) => analysis.player.nickname);

    return {
      role,
      playerCount: specialists.length,
      specialists,
    } satisfies StrategyTeamRoleCoverage;
  });

  const mapMetrics = buildTeamMapMetrics(playerAnalyses);
  const preferredMaps = Array.from(mapMetrics.values())
    .toSorted((left, right) => right.averageWinRate - left.averageWinRate)
    .slice(0, 3);
  const weakMaps = Array.from(mapMetrics.values())
    .toSorted((left, right) => left.averageWinRate - right.averageWinRate)
    .slice(0, 3);
  const signatureHeroes = buildTeamHeroFocuses(playerAnalyses);
  const synergyPairs = buildSynergyPairs(
    playerAnalyses.map((analysis) => analysis.player),
    matches,
  );

  const summaryLines = buildTeamSummaryLines({
    side,
    preferredMaps,
    signatureHeroes,
    synergyPairs,
    roleCoverage,
    averageRecentWinRate,
  });

  return {
    report: {
      side,
      roster: playerAnalyses.map((analysis) => analysis.report),
      averageOverallWinRate,
      averageRecentWinRate,
      roleCoverage,
      preferredMaps,
      weakMaps,
      signatureHeroes,
      synergyPairs,
      summaryLines,
    },
    mapMetrics,
  };
}

function toHeroSummary(heroStats: HeroAccumulator): StrategyHeroSummary {
  const counts = buildWinRateStatsFromCounts(heroStats.counts);
  return {
    hero: heroStats.hero,
    role: heroStats.role,
    averageHeroDamage: counts.totalGames > 0 ? round(heroStats.totalHeroDamage / counts.totalGames, 0) : 0,
    averageDpm: counts.totalGames > 0 ? round(heroStats.totalDpm / counts.totalGames, 1) : 0,
    lastPlayedAt: heroStats.lastPlayedAt?.toISOString() ?? null,
    ...counts,
  };
}

function buildTeamMapMetrics(playerAnalyses: ReadonlyArray<PlayerAnalysis>): Map<GameMap, TeamMapMetric> {
  const mapAccumulator = new Map<
    GameMap,
    {
      totalWinRate: number;
      qualifiedPlayerCount: number;
      standoutPlayers: { nickname: string; winRate: number }[];
    }
  >();

  for (const analysis of playerAnalyses) {
    for (const mapStat of analysis.allMapStats) {
      if (mapStat.totalGames < 2) {
        continue;
      }

      const current = mapAccumulator.get(mapStat.map) ?? {
        totalWinRate: 0,
        qualifiedPlayerCount: 0,
        standoutPlayers: [],
      };

      current.totalWinRate += mapStat.winRate;
      current.qualifiedPlayerCount += 1;
      current.standoutPlayers.push({
        nickname: analysis.player.nickname,
        winRate: mapStat.winRate,
      });
      mapAccumulator.set(mapStat.map, current);
    }
  }

  return new Map(
    Array.from(mapAccumulator.entries(), ([map, value]) => [
      map,
      {
        map,
        averageWinRate: value.qualifiedPlayerCount > 0 ? round(value.totalWinRate / value.qualifiedPlayerCount, 1) : 0,
        qualifiedPlayerCount: value.qualifiedPlayerCount,
        standoutPlayers: value.standoutPlayers
          .toSorted((left, right) => right.winRate - left.winRate)
          .slice(0, 2)
          .map((item) => item.nickname),
      } satisfies TeamMapMetric,
    ]),
  );
}

function buildTeamHeroFocuses(playerAnalyses: ReadonlyArray<PlayerAnalysis>): StrategyTeamHeroFocus[] {
  const heroAccumulator = new Map<
    Hero,
    {
      players: Set<string>;
      totalGames: number;
      weightedWinRate: number;
    }
  >();

  for (const analysis of playerAnalyses) {
    for (const heroStat of analysis.report.signatureHeroes) {
      const current = heroAccumulator.get(heroStat.hero) ?? {
        players: new Set<string>(),
        totalGames: 0,
        weightedWinRate: 0,
      };

      current.players.add(analysis.player.nickname);
      current.totalGames += heroStat.totalGames;
      current.weightedWinRate += heroStat.winRate * heroStat.totalGames;
      heroAccumulator.set(heroStat.hero, current);
    }
  }

  return Array.from(heroAccumulator.entries(), ([hero, value]) => ({
    hero,
    playerNicknames: Array.from(value.players),
    totalGames: value.totalGames,
    averageWinRate: value.totalGames > 0 ? round(value.weightedWinRate / value.totalGames, 1) : 0,
  }))
    .toSorted(
      (left, right) =>
        right.playerNicknames.length - left.playerNicknames.length ||
        right.averageWinRate - left.averageWinRate ||
        right.totalGames - left.totalGames,
    )
    .slice(0, TEAM_LIST_LIMIT);
}

function buildSynergyPairs(
  players: ReadonlyArray<SelectedPlayer>,
  matches: ReadonlyArray<MatchRow>,
): StrategyTeamSynergyPair[] {
  const pairAccumulator = new Map<
    string,
    {
      playerA: string;
      playerB: string;
      encounterMatches: number;
      sameTeamMatches: number;
      sameTeamCounts: ReturnType<typeof createResultCounts>;
    }
  >();

  for (let index = 0; index < players.length; index += 1) {
    for (let subIndex = index + 1; subIndex < players.length; subIndex += 1) {
      const playerA = players[index];
      const playerB = players[subIndex];
      pairAccumulator.set(`${playerA.id}:${playerB.id}`, {
        playerA: playerA.nickname,
        playerB: playerB.nickname,
        encounterMatches: 0,
        sameTeamMatches: 0,
        sameTeamCounts: createResultCounts(),
      });
    }
  }

  for (const match of matches) {
    const teamByPlayerId = getTeamNumberByPlayerId(match);

    for (let index = 0; index < players.length; index += 1) {
      for (let subIndex = index + 1; subIndex < players.length; subIndex += 1) {
        const playerA = players[index];
        const playerB = players[subIndex];
        const teamA = teamByPlayerId.get(playerA.id);
        const teamB = teamByPlayerId.get(playerB.id);

        if (!teamA || !teamB) {
          continue;
        }

        const pair = pairAccumulator.get(`${playerA.id}:${playerB.id}`)!;
        pair.encounterMatches += 1;

        if (teamA === teamB) {
          pair.sameTeamMatches += 1;
          updateCountsByResult(pair.sameTeamCounts, toResultByWinnerTeamNumber(match.winnerTeamNumber, teamA));
        }
      }
    }
  }

  return Array.from(pairAccumulator.values(), (pair) => {
    const stats = buildWinRateStatsFromCounts(pair.sameTeamCounts);
    return {
      playerA: pair.playerA,
      playerB: pair.playerB,
      encounterMatches: pair.encounterMatches,
      sameTeamMatches: pair.sameTeamMatches,
      sameTeamRate: pair.encounterMatches > 0 ? round((pair.sameTeamMatches / pair.encounterMatches) * 100, 1) : 0,
      sameTeamWinRate: stats.winRate,
    } satisfies StrategyTeamSynergyPair;
  })
    .filter((pair) => pair.sameTeamMatches > 0)
    .toSorted(
      (left, right) =>
        right.sameTeamWinRate - left.sameTeamWinRate ||
        right.sameTeamMatches - left.sameTeamMatches ||
        right.sameTeamRate - left.sameTeamRate,
    )
    .slice(0, TEAM_LIST_LIMIT);
}

function buildMatchupReport(input: {
  allyPlayers: ReadonlyArray<SelectedPlayer>;
  enemyPlayers: ReadonlyArray<SelectedPlayer>;
  selectedMaps: ReadonlyArray<GameMap>;
  allyTeam: TeamAnalysis;
  enemyTeam: TeamAnalysis;
  allyPlayerAnalyses: ReadonlyArray<PlayerAnalysis>;
  enemyPlayerAnalyses: ReadonlyArray<PlayerAnalysis>;
  matches: ReadonlyArray<MatchRow>;
}): StrategyMatchupReport {
  const enteredRosterCounts = createResultCounts();
  const playerMatchups = new Map<
    string,
    {
      allyNickname: string;
      enemyNickname: string;
      allyWins: number;
      enemyWins: number;
      draws: number;
    }
  >();

  const allyIds = new Set(input.allyPlayers.map((player) => player.id));
  const enemyIds = new Set(input.enemyPlayers.map((player) => player.id));

  for (const match of input.matches) {
    const teamByPlayerId = getTeamNumberByPlayerId(match);
    const allyTeamNumber = findContainingTeamNumber(allyIds, teamByPlayerId);
    const enemyTeamNumber = findContainingTeamNumber(enemyIds, teamByPlayerId);

    if (allyTeamNumber && enemyTeamNumber && allyTeamNumber !== enemyTeamNumber) {
      updateCountsByResult(enteredRosterCounts, toResultByWinnerTeamNumber(match.winnerTeamNumber, allyTeamNumber));
    }

    for (const allyPlayer of input.allyPlayers) {
      const allyPlayerTeam = teamByPlayerId.get(allyPlayer.id);
      if (!allyPlayerTeam) {
        continue;
      }

      for (const enemyPlayer of input.enemyPlayers) {
        const enemyPlayerTeam = teamByPlayerId.get(enemyPlayer.id);
        if (!enemyPlayerTeam || enemyPlayerTeam === allyPlayerTeam) {
          continue;
        }

        const key = `${allyPlayer.id}:${enemyPlayer.id}`;
        const current = playerMatchups.get(key) ?? {
          allyNickname: allyPlayer.nickname,
          enemyNickname: enemyPlayer.nickname,
          allyWins: 0,
          enemyWins: 0,
          draws: 0,
        };

        const result = toResultByWinnerTeamNumber(match.winnerTeamNumber, allyPlayerTeam);
        if (result === GameResult.WIN) {
          current.allyWins += 1;
        } else if (result === GameResult.LOSE) {
          current.enemyWins += 1;
        } else {
          current.draws += 1;
        }
        playerMatchups.set(key, current);
      }
    }
  }

  const enteredRosterStats = buildWinRateStatsFromCounts(enteredRosterCounts);
  const selectedMapPlans = input.selectedMaps.map((map) =>
    buildSelectedMapPlan({
      map,
      allyMetric: input.allyTeam.mapMetrics.get(map) ?? null,
      enemyMetric: input.enemyTeam.mapMetrics.get(map) ?? null,
      allyPlayerAnalyses: input.allyPlayerAnalyses,
      enemyPlayerAnalyses: input.enemyPlayerAnalyses,
    }),
  );
  const matchupRows = Array.from(playerMatchups.values(), (value) => {
    const totalMatches = value.allyWins + value.enemyWins + value.draws;
    return {
      allyNickname: value.allyNickname,
      enemyNickname: value.enemyNickname,
      matches: totalMatches,
      allyWins: value.allyWins,
      enemyWins: value.enemyWins,
      draws: value.draws,
      allyWinRate: totalMatches > 0 ? round((value.allyWins / totalMatches) * 100, 1) : 0,
    } satisfies StrategyPlayerMatchup;
  })
    .filter((row) => row.matches > 0)
    .toSorted(
      (left, right) =>
        right.matches - left.matches || Math.abs(50 - left.allyWinRate) - Math.abs(50 - right.allyWinRate),
    )
    .slice(0, 8);

  return {
    selectedMaps: input.selectedMaps,
    enteredRosterStats,
    enteredRosterMatchCount: enteredRosterStats.totalGames,
    selectedMapPlans,
    playerMatchups: matchupRows,
    summaryLines: buildMatchupSummaryLines({
      selectedMaps: input.selectedMaps,
      enteredRosterStats,
      selectedMapPlans,
    }),
  };
}

function buildSelectedMapPlan(input: {
  map: GameMap;
  allyMetric: TeamMapMetric | null;
  enemyMetric: TeamMapMetric | null;
  allyPlayerAnalyses: ReadonlyArray<PlayerAnalysis>;
  enemyPlayerAnalyses: ReadonlyArray<PlayerAnalysis>;
}): StrategySelectedMapPlan {
  const allyAverageWinRate = input.allyMetric?.averageWinRate ?? 0;
  const enemyAverageWinRate = input.enemyMetric?.averageWinRate ?? 0;
  const recommendedPicks = buildHeroRecommendationsForMap(input.allyPlayerAnalyses, input.map);
  const recommendedBans = buildHeroRecommendationsForMap(input.enemyPlayerAnalyses, input.map);

  return {
    map: input.map,
    allyAverageWinRate,
    enemyAverageWinRate,
    edge: round(allyAverageWinRate - enemyAverageWinRate, 1),
    allyStandouts: input.allyMetric?.standoutPlayers ?? [],
    enemyStandouts: input.enemyMetric?.standoutPlayers ?? [],
    recommendedPicks,
    recommendedBans,
    summaryLines: buildSelectedMapPlanSummaryLines({
      map: input.map,
      allyAverageWinRate,
      enemyAverageWinRate,
      allyStandouts: input.allyMetric?.standoutPlayers ?? [],
      enemyStandouts: input.enemyMetric?.standoutPlayers ?? [],
      recommendedPicks,
      recommendedBans,
      allyQualifiedPlayers: input.allyMetric?.qualifiedPlayerCount ?? 0,
      enemyQualifiedPlayers: input.enemyMetric?.qualifiedPlayerCount ?? 0,
    }),
  };
}

function buildHeroRecommendationsForMap(
  playerAnalyses: ReadonlyArray<PlayerAnalysis>,
  map: GameMap,
): StrategyHeroRecommendation[] {
  const heroAccumulator = new Map<
    Hero,
    {
      players: Set<string>;
      totalGames: number;
      weightedWinRate: number;
      source: "MAP" | "OVERALL";
      mapBackedPlayers: number;
    }
  >();

  for (const analysis of playerAnalyses) {
    const mapCandidates = (analysis.mapHeroStatsByMap.get(map) ?? [])
      .filter((item) => item.totalGames >= MIN_STRATEGY_HERO_GAMES)
      .slice(0, 2);
    const overallCandidates = analysis.report.signatureHeroes
      .filter((item) => item.totalGames >= MIN_STRATEGY_HERO_GAMES)
      .slice(0, 2);
    const candidates = (mapCandidates.length > 0 ? mapCandidates : overallCandidates).slice(0, 2);
    const source: "MAP" | "OVERALL" = mapCandidates.length > 0 ? "MAP" : "OVERALL";

    for (const candidate of candidates) {
      const current = heroAccumulator.get(candidate.hero) ?? {
        players: new Set<string>(),
        totalGames: 0,
        weightedWinRate: 0,
        source,
        mapBackedPlayers: 0,
      };

      current.players.add(analysis.player.nickname);
      current.totalGames += candidate.totalGames;
      current.weightedWinRate += candidate.winRate * candidate.totalGames;
      current.mapBackedPlayers += source === "MAP" ? 1 : 0;
      if (source === "MAP") {
        current.source = "MAP";
      }

      heroAccumulator.set(candidate.hero, current);
    }
  }

  return Array.from(heroAccumulator.entries(), ([hero, value]) => {
    const playerNicknames = Array.from(value.players);
    const averageWinRate = value.totalGames > 0 ? round(value.weightedWinRate / value.totalGames, 1) : 0;
    const source = value.mapBackedPlayers > 0 ? "MAP" : value.source;
    return {
      hero,
      playerNicknames,
      samplePlayers: playerNicknames.length,
      totalGames: value.totalGames,
      averageWinRate,
      source,
      reason:
        source === "MAP"
          ? `${playerNicknames.join(", ")}이(가) 이 맵에서 ${averageWinRate}% 승률(${value.totalGames}경기)입니다.`
          : `${playerNicknames.join(", ")}이(가) 주력으로 쓰며 ${averageWinRate}% 승률(${value.totalGames}경기)입니다.`,
    } satisfies StrategyHeroRecommendation;
  })
    .toSorted((left, right) => compareHeroRecommendation(left, right))
    .slice(0, 3);
}

function buildTeamSummaryLines(input: {
  side: StrategySide;
  preferredMaps: ReadonlyArray<StrategyTeamMapFocus>;
  signatureHeroes: ReadonlyArray<StrategyTeamHeroFocus>;
  synergyPairs: ReadonlyArray<StrategyTeamSynergyPair>;
  roleCoverage: ReadonlyArray<StrategyTeamRoleCoverage>;
  averageRecentWinRate: number;
}): string[] {
  const lines: string[] = [];
  const teamLabel = input.side === "ALLY" ? "우리 팀" : "상대 팀";

  if (input.preferredMaps[0]) {
    lines.push(
      `최고 선호 맵은 ${getMapName(input.preferredMaps[0].map)}입니다. (평균 승률 ${input.preferredMaps[0].averageWinRate}%)`,
    );
  }

  if (input.signatureHeroes[0]) {
    lines.push(
      `핵심 시그니처는 ${getHeroName(input.signatureHeroes[0].hero)}입니다. (${input.signatureHeroes[0].playerNicknames.join(", ")})`,
    );
  }

  if (input.synergyPairs[0]) {
    lines.push(
      `${input.synergyPairs[0].playerA}-${input.synergyPairs[0].playerB} 조합은 같은 팀일 때 승률 ${input.synergyPairs[0].sameTeamWinRate}%입니다.`,
    );
  }

  const missingRoles = input.roleCoverage
    .filter((item) => item.playerCount === 0)
    .map((item) => ROLE_LABELS[item.role]);
  if (missingRoles.length > 0) {
    lines.push(`${teamLabel} 로스터에 주 역할 기준 ${missingRoles.join(", ")} 전문 인원이 부족합니다.`);
  } else {
    lines.push(`${teamLabel} 최근 폼 평균 승률은 ${input.averageRecentWinRate}%입니다.`);
  }

  return lines.slice(0, 4);
}

function buildMatchupSummaryLines(input: {
  selectedMaps: ReadonlyArray<GameMap>;
  enteredRosterStats: StrategyMatchupReport["enteredRosterStats"];
  selectedMapPlans: ReadonlyArray<StrategySelectedMapPlan>;
}): string[] {
  const lines: string[] = [];

  if (input.enteredRosterStats.totalGames > 0) {
    lines.push(
      `입력한 로스터 기준 과거 맞대결은 ${input.enteredRosterStats.wins}승 ${input.enteredRosterStats.losses}패 ${input.enteredRosterStats.draws}무입니다.`,
    );
  } else {
    lines.push("입력한 로스터 조합으로 직접 겹친 맞대결 표본은 아직 없습니다.");
  }

  lines.push(`선택한 맵 ${input.selectedMaps.length}개 기준으로 맵별 밴/픽 제안을 함께 제공합니다.`);

  const bestEdgeMap = input.selectedMapPlans.toSorted((left, right) => right.edge - left.edge)[0];
  if (bestEdgeMap) {
    const direction = bestEdgeMap.edge >= 0 ? "우리 팀" : "상대 팀";
    lines.push(
      `${getMapName(bestEdgeMap.map)}은(는) ${direction} 쪽 맵 숙련도가 더 높습니다. (${bestEdgeMap.allyAverageWinRate}% vs ${bestEdgeMap.enemyAverageWinRate}%)`,
    );
  }

  const firstBan = input.selectedMapPlans.flatMap((plan) =>
    plan.recommendedBans.map((item) => ({ ...item, map: plan.map })),
  )[0];
  if (firstBan) {
    lines.push(
      `${getMapName(firstBan.map)}에서 우선 밴 후보는 ${getHeroName(firstBan.hero)}입니다. ${firstBan.reason}`,
    );
  }

  return lines.slice(0, 4);
}

function buildSelectedMapPlanSummaryLines(input: {
  map: GameMap;
  allyAverageWinRate: number;
  enemyAverageWinRate: number;
  allyStandouts: ReadonlyArray<string>;
  enemyStandouts: ReadonlyArray<string>;
  recommendedPicks: ReadonlyArray<StrategyHeroRecommendation>;
  recommendedBans: ReadonlyArray<StrategyHeroRecommendation>;
  allyQualifiedPlayers: number;
  enemyQualifiedPlayers: number;
}): string[] {
  const lines: string[] = [];
  const edge = round(input.allyAverageWinRate - input.enemyAverageWinRate, 1);

  if (input.allyQualifiedPlayers > 0 || input.enemyQualifiedPlayers > 0) {
    if (edge >= 8) {
      lines.push(`${getMapName(input.map)}은(는) 우리 팀 쪽 맵 숙련도 우위가 뚜렷합니다.`);
    } else if (edge <= -8) {
      lines.push(`${getMapName(input.map)}은(는) 상대 팀 쪽 맵 숙련도 우위가 뚜렷합니다.`);
    } else {
      lines.push(`${getMapName(input.map)}은(는) 양 팀 맵 숙련도 차이가 크지 않습니다.`);
    }
  } else {
    lines.push(`${getMapName(input.map)}은(는) 맵 표본이 적어 영웅 추천 중심으로 보는 편이 좋습니다.`);
  }

  if (input.recommendedBans[0]) {
    lines.push(`밴 우선순위는 ${getHeroName(input.recommendedBans[0].hero)}입니다.`);
  }

  if (input.recommendedPicks[0]) {
    lines.push(`우리 팀 추천 픽 시작점은 ${getHeroName(input.recommendedPicks[0].hero)}입니다.`);
  }

  if (input.enemyStandouts.length > 0 || input.allyStandouts.length > 0) {
    const allyText = input.allyStandouts.length > 0 ? input.allyStandouts.join(", ") : "표본 부족";
    const enemyText = input.enemyStandouts.length > 0 ? input.enemyStandouts.join(", ") : "표본 부족";
    lines.push(`우리 팀 핵심은 ${allyText}, 상대 핵심은 ${enemyText}입니다.`);
  }

  return lines.slice(0, 4);
}

function compareHeroRecommendation(left: StrategyHeroRecommendation, right: StrategyHeroRecommendation): number {
  const leftScore = scoreHeroRecommendation(left);
  const rightScore = scoreHeroRecommendation(right);
  return rightScore - leftScore || right.samplePlayers - left.samplePlayers || right.totalGames - left.totalGames;
}

function scoreHeroRecommendation(item: StrategyHeroRecommendation): number {
  const sourceBonus = item.source === "MAP" ? 12 : 0;
  return item.samplePlayers * 20 + item.averageWinRate + Math.min(item.totalGames, 10) * 2 + sourceBonus;
}

function compareWinRateWithSample(
  left: Pick<StrategyHeroSummary | StrategyMapSummary, "winRate" | "totalGames">,
  right: Pick<StrategyHeroSummary | StrategyMapSummary, "winRate" | "totalGames">,
): number {
  const leftScore = scoreWithSample(left.winRate, left.totalGames);
  const rightScore = scoreWithSample(right.winRate, right.totalGames);
  return rightScore - leftScore || right.totalGames - left.totalGames || right.winRate - left.winRate;
}

function scoreWithSample(winRate: number, totalGames: number): number {
  return winRate + Math.min(totalGames, 10) * 3;
}

function getMapName(map: GameMap): string {
  return MAP_CATALOG[map]?.nameKo ?? map;
}

function getHeroName(hero: Hero): string {
  return HERO_CATALOG[hero]?.nameKo ?? hero;
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
  let resolvedTeamNumber: number | null = null;

  for (const playerId of playerIds) {
    const teamNumber = teamByPlayerId.get(playerId);
    if (!teamNumber) {
      return null;
    }

    if (resolvedTeamNumber === null) {
      resolvedTeamNumber = teamNumber;
      continue;
    }

    if (resolvedTeamNumber !== teamNumber) {
      return null;
    }
  }

  return resolvedTeamNumber;
}
