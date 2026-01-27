import { WinRateStats } from "@/app/api/stats/types";
import { useCallback } from "react";

export type ScrimTier = {
  readonly key: "diamond" | "platinum" | "gold" | "silver" | "bronze";
  readonly label: string;
  readonly className: string;
};

export type ScrimTierResult = {
  readonly tier: ScrimTier;
  readonly score: number;
};

type ScrimTierRule = ScrimTier & {
  readonly min: number;
};

const TIER_RULES: ReadonlyArray<ScrimTierRule> = [
  {
    key: "diamond",
    label: "다이아",
    min: 50,
    className: "text-cyan-200 bg-cyan-500/15 border-cyan-400/40",
  },
  {
    key: "platinum",
    label: "플래티넘",
    min: 42,
    className: "text-sky-200 bg-sky-500/15 border-sky-400/40",
  },
  {
    key: "gold",
    label: "골드",
    min: 34,
    className: "text-amber-200 bg-amber-500/15 border-amber-400/40",
  },
  {
    key: "silver",
    label: "실버",
    min: 26,
    className: "text-slate-200 bg-slate-500/15 border-slate-400/40",
  },
  {
    key: "bronze",
    label: "브론즈",
    min: 0,
    className: "text-orange-200 bg-orange-500/15 border-orange-400/40",
  },
];

const FALLBACK_TIER = TIER_RULES[TIER_RULES.length - 1];

export function useScrimWinRateTier() {
  return useCallback(
    (matchStats: WinRateStats, gameStats: WinRateStats): ScrimTierResult => {
      const score = calculateCompositeScore(matchStats, gameStats);
      const tier = TIER_RULES.find((entry) => score >= entry.min) ?? FALLBACK_TIER;

      return { tier, score };
    },
    []
  );
}


function calculateCompositeScore(matchStats: WinRateStats, gameStats: WinRateStats) {
  // ---- tunables ----
  const PRIOR_GAMES_K = 15; // 베이지안 프라이어 강도
  const Z = 1.28;          // 보수성 (≈90% 하한)
  const MATCH_WEIGHT = 0.6;
  const GAME_WEIGHT = 0.5;

  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  const conservativeBayesScore = (s: WinRateStats): number => {
    const total =
      s.totalGames > 0
        ? s.totalGames
        : s.wins + s.losses + s.draws;

    if (total <= 0) return 50;

    const effectiveWins = s.wins + 0.5 * s.draws;
    const p0 = 0.5;

    // posterior mean
    const p =
      (effectiveWins + PRIOR_GAMES_K * p0) /
      (total + PRIOR_GAMES_K);

    // uncertainty penalty (lower bound)
    const nEff = total + PRIOR_GAMES_K;
    const se = Math.sqrt((p * (1 - p)) / nEff);
    const lower = clamp01(p - Z * se);

    return lower * 100;
  };

  const matchScore = conservativeBayesScore(matchStats);
  const gameScore = conservativeBayesScore(gameStats);

  return MATCH_WEIGHT * matchScore + GAME_WEIGHT * gameScore;
}
