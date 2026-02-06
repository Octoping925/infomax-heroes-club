import { WinRateStats } from "@/app/api/stats/types";

export type ConservativeWinRateOptions = {
  readonly priorGamesK?: number;
  readonly zScore?: number;
};

export type CompositeConservativeScoreOptions = ConservativeWinRateOptions & {
  readonly matchWeight?: number;
  readonly gameWeight?: number;
};

const DEFAULT_PRIOR_GAMES_K = 15;
const DEFAULT_Z_SCORE = 1.28; // 약 90% 신뢰 하한
const DEFAULT_MATCH_WEIGHT = 0.7;
const DEFAULT_GAME_WEIGHT = 0.35;

export function calculateConservativeWinRateScore(
  stats: WinRateStats,
  options: ConservativeWinRateOptions = {},
): number {
  const priorGamesK = options.priorGamesK ?? DEFAULT_PRIOR_GAMES_K;
  const zScore = options.zScore ?? DEFAULT_Z_SCORE;
  const total = stats.totalGames > 0 ? stats.totalGames : stats.wins + stats.losses + stats.draws;

  if (total <= 0) {
    return 50;
  }

  const effectiveWins = stats.wins + 0.5 * stats.draws;
  const priorMean = 0.5;
  const posterior = (effectiveWins + priorGamesK * priorMean) / (total + priorGamesK);
  const nEff = total + priorGamesK;
  const standardError = Math.sqrt((posterior * (1 - posterior)) / nEff);
  const lowerBound = clamp01(posterior - zScore * standardError);

  return lowerBound * 100;
}

export function calculateCompositeConservativeScore(
  matchStats: WinRateStats,
  gameStats: WinRateStats,
  options: CompositeConservativeScoreOptions = {},
): number {
  const matchWeight = options.matchWeight ?? DEFAULT_MATCH_WEIGHT;
  const gameWeight = options.gameWeight ?? DEFAULT_GAME_WEIGHT;
  const matchScore = calculateConservativeWinRateScore(matchStats, options);
  const gameScore = calculateConservativeWinRateScore(gameStats, options);

  return matchWeight * matchScore + gameWeight * gameScore;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
