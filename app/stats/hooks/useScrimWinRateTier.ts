import { WinRateStats } from "@/app/api/stats/types";
import { calculateCompositeConservativeScore } from "@/app/stats/utils/conservative-win-rate";
import { useCallback } from "react";

export type ScrimTier = {
  readonly key: "challenger" | "diamond" | "platinum" | "gold" | "silver" | "bronze";
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
    key: "challenger",
    label: "챌린저",
    min: 49,
    className: "text-purple-200 bg-purple-500/15 border-purple-400/40",
  },
  {
    key: "diamond",
    label: "다이아",
    min: 45,
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
    min: 36,
    className: "text-amber-200 bg-amber-500/15 border-amber-400/40",
  },
  {
    key: "silver",
    label: "실버",
    min: 32,
    className: "text-slate-200 bg-slate-500/15 border-slate-400/40",
  },
  {
    key: "bronze",
    label: "브론즈",
    min: 0,
    className: "text-orange-200 bg-orange-500/15 border-orange-400/40",
  },
];

const FALLBACK_TIER = TIER_RULES.at(-1)!;

export function useScrimWinRateTier() {
  return useCallback((matchStats: WinRateStats, gameStats: WinRateStats): ScrimTierResult => {
    const score = calculateCompositeConservativeScore(matchStats, gameStats);
    const tier = TIER_RULES.find((entry) => score >= entry.min) ?? FALLBACK_TIER;

    return { tier, score };
  }, []);
}
