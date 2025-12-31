export type LunchDinnerUnit = "game" | "match";

export interface FantasyDuoParams {
  readonly unit: LunchDinnerUnit;
  readonly minCount: number;
  readonly limit: number;
}

export interface HeroDuoParams {
  readonly minCount: number;
  readonly limit: number;
}

export interface RivalryParams {
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
      popular: () => ["stats", "heroes", "popular"],
      fantasyDuo: (params: HeroDuoParams) => [
        "stats",
        "heroes",
        "fantasy-duo",
        params,
      ],
    },
    players: {
      winRate: (nickname: string) => ["stats", "players", "win-rate", nickname],
      heroStats: (nickname: string) => [
        "stats",
        "players",
        "hero-stats",
        nickname,
      ],
      lunchDinner: (unit: LunchDinnerUnit) => [
        "stats",
        "players",
        "lunch-dinner",
        unit,
      ],
      fantasyDuo: (params: FantasyDuoParams) => [
        "stats",
        "players",
        "fantasy-duo",
        params,
      ],
      matchWinRate: () => ["stats", "players", "match-win-rate"],
      overallWinRate: () => ["stats", "players", "overall-win-rate"],
    },
    maps: () => ["stats", "maps"],
    mapsHero: () => ["stats", "maps", "hero"],
    teamSwitch: () => ["stats", "team-switch"],
    rankings: {
      lunchDinnerDiff: () => ["stats", "rankings", "lunch-dinner-diff"],
      avgStats: () => ["stats", "rankings", "avg-stats"],
    },
    rivalries: (params: RivalryParams) => ["stats", "rivalries", params],
  },
} as const;
