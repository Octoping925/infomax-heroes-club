import type { WinRateStats } from "@/app/api/stats/types";
import type { GameMap, Hero, HeroRole } from "@/domain/hots/models";

export type StrategySide = "ALLY" | "ENEMY";

export interface StrategyReportRequest {
  readonly allyNicknames: ReadonlyArray<string>;
  readonly enemyNicknames: ReadonlyArray<string>;
  readonly selectedMaps: ReadonlyArray<GameMap>;
}

export interface StrategyHeroSummary extends WinRateStats {
  readonly hero: Hero;
  readonly role: HeroRole;
  readonly averageHeroDamage: number;
  readonly averageDpm: number;
  readonly lastPlayedAt: string | null;
}

export interface StrategyMapSummary extends WinRateStats {
  readonly map: GameMap;
  readonly averageHeroDamage: number;
  readonly averageDpm: number;
  readonly topHeroes: ReadonlyArray<{
    readonly hero: Hero;
    readonly games: number;
    readonly winRate: number;
  }>;
}

export interface StrategyRecentGameSummary {
  readonly gameId: string;
  readonly playedAt: string;
  readonly map: GameMap;
  readonly hero: Hero;
  readonly result: "WIN" | "LOSE" | "DRAW";
  readonly dpm: number;
}

export interface StrategyPlayerRoleSummary {
  readonly role: HeroRole;
  readonly games: number;
  readonly rate: number;
}

export interface StrategyPlayerReport {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
  readonly overallStats: WinRateStats;
  readonly recentStats: WinRateStats;
  readonly primaryRole: HeroRole | null;
  readonly roleStats: ReadonlyArray<StrategyPlayerRoleSummary>;
  readonly signatureHeroes: ReadonlyArray<StrategyHeroSummary>;
  readonly strongMaps: ReadonlyArray<StrategyMapSummary>;
  readonly weakMaps: ReadonlyArray<StrategyMapSummary>;
  readonly recentGames: ReadonlyArray<StrategyRecentGameSummary>;
  readonly headline: string;
}

export interface StrategyTeamRoleCoverage {
  readonly role: HeroRole;
  readonly playerCount: number;
  readonly specialists: ReadonlyArray<string>;
}

export interface StrategyTeamMapFocus {
  readonly map: GameMap;
  readonly averageWinRate: number;
  readonly qualifiedPlayerCount: number;
  readonly standoutPlayers: ReadonlyArray<string>;
}

export interface StrategyTeamHeroFocus {
  readonly hero: Hero;
  readonly playerNicknames: ReadonlyArray<string>;
  readonly totalGames: number;
  readonly averageWinRate: number;
}

export interface StrategyTeamSynergyPair {
  readonly playerA: string;
  readonly playerB: string;
  readonly encounterMatches: number;
  readonly sameTeamMatches: number;
  readonly sameTeamRate: number;
  readonly sameTeamWinRate: number;
}

export interface StrategyTeamReport {
  readonly side: StrategySide;
  readonly roster: ReadonlyArray<StrategyPlayerReport>;
  readonly averageOverallWinRate: number;
  readonly averageRecentWinRate: number;
  readonly roleCoverage: ReadonlyArray<StrategyTeamRoleCoverage>;
  readonly preferredMaps: ReadonlyArray<StrategyTeamMapFocus>;
  readonly weakMaps: ReadonlyArray<StrategyTeamMapFocus>;
  readonly signatureHeroes: ReadonlyArray<StrategyTeamHeroFocus>;
  readonly synergyPairs: ReadonlyArray<StrategyTeamSynergyPair>;
  readonly summaryLines: ReadonlyArray<string>;
}

export interface StrategyHeroRecommendation {
  readonly hero: Hero;
  readonly playerNicknames: ReadonlyArray<string>;
  readonly samplePlayers: number;
  readonly totalGames: number;
  readonly averageWinRate: number;
  readonly source: "MAP" | "OVERALL";
  readonly reason: string;
}

export interface StrategySelectedMapPlan {
  readonly map: GameMap;
  readonly allyAverageWinRate: number;
  readonly enemyAverageWinRate: number;
  readonly edge: number;
  readonly allyStandouts: ReadonlyArray<string>;
  readonly enemyStandouts: ReadonlyArray<string>;
  readonly recommendedBans: ReadonlyArray<StrategyHeroRecommendation>;
  readonly recommendedPicks: ReadonlyArray<StrategyHeroRecommendation>;
  readonly summaryLines: ReadonlyArray<string>;
}

export interface StrategyPlayerMatchup {
  readonly allyNickname: string;
  readonly enemyNickname: string;
  readonly matches: number;
  readonly allyWins: number;
  readonly enemyWins: number;
  readonly draws: number;
  readonly allyWinRate: number;
}

export interface StrategyMatchupReport {
  readonly selectedMaps: ReadonlyArray<GameMap>;
  readonly enteredRosterStats: WinRateStats;
  readonly enteredRosterMatchCount: number;
  readonly selectedMapPlans: ReadonlyArray<StrategySelectedMapPlan>;
  readonly playerMatchups: ReadonlyArray<StrategyPlayerMatchup>;
  readonly summaryLines: ReadonlyArray<string>;
}

export interface StrategyReportResponse {
  readonly generatedAt: string;
  readonly allyTeam: StrategyTeamReport;
  readonly enemyTeam: StrategyTeamReport;
  readonly matchup: StrategyMatchupReport;
}
