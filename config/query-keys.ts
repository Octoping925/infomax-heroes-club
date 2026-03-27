export type LunchDinnerUnit = "game" | "match";

export interface StatsYearParams {
  readonly year?: number;
}

export interface FantasyDuoParams extends StatsYearParams {
  readonly unit: LunchDinnerUnit;
  readonly minCount: number;
  readonly limit: number;
}

export interface HeroDuoParams extends StatsYearParams {
  readonly minCount: number;
  readonly limit: number;
}

export interface RivalryParams extends StatsYearParams {
  readonly minMatches: number;
  readonly limit: number;
  readonly takeMatches: number;
  readonly includeInsufficientSample: boolean;
}

export const statsQueryKeys = {
  players: () => ["players"],
  matches: {
    latest: (take: number) => ["matches", "latest", take],
  },
  stats: {
    heroes: {
      tier: (year?: number) => ["stats", "heroes", "tier", year],
      counterPicks: (year?: number) => ["stats", "heroes", "counter-picks", year],
      fantasyDuo: (params: HeroDuoParams) => ["stats", "heroes", "fantasy-duo", params],
    },
    players: {
      winRate: (nickname: string) => ["stats", "players", "win-rate", nickname],
      heroStats: (nickname: string, year?: number) => ["stats", "players", "hero-stats", nickname, year],
      formTrend: (nickname: string, take: number, year?: number) =>
        ["stats", "players", "form-trend", nickname, take, year],
      fantasyDuo: (params: FantasyDuoParams) => ["stats", "players", "fantasy-duo", params],
      matchWinRate: () => ["stats", "players", "match-win-rate"],
      overallWinRate: (year?: number) => ["stats", "players", "overall-win-rate", year],
    },
    maps: (year?: number) => ["stats", "maps", year],
    mapsHero: (year?: number) => ["stats", "maps", "hero", year],
    teamSwitch: (year?: number) => ["stats", "team-switch", year],
    teamComposer: (year?: number) => ["stats", "team-composer", year],
    rankings: {
      avgStats: (year?: number) => ["stats", "rankings", "avg-stats", year],
    },
    rivalries: (params: RivalryParams) => ["stats", "rivalries", params],
  },
} as const;
