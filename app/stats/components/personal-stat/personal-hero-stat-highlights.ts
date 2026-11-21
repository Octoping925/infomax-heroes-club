import type { HeroWinRateResponse, WinRateStats } from "@/app/api/stats/types";
import { HeroMap } from "@/domain/hots/constants";
import { calculateConservativeWinRateScore } from "../../utils/conservative-win-rate";

export const MIN_HERO_HIGHLIGHT_GAMES = 3;

const rateScore = (stat: WinRateStats) => calculateConservativeWinRateScore(stat, { zScore: 0.65 });

export function getPersonalHeroStatHighlights(stats: readonly HeroWinRateResponse[]) {
  const candidates = stats
    .filter((stat) => stat.totalGames >= MIN_HERO_HIGHLIGHT_GAMES)
    .toSorted((a, b) => b.totalGames - a.totalGames || HeroMap[a.hero].localeCompare(HeroMap[b.hero], "ko"));
  const rankBy = (scoreFor: (stat: WinRateStats) => number) => candidates
    .map((stat) => ({ stat, score: scoreFor(stat) }))
    .filter(({ score }) => score > 50)
    .toSorted((a, b) => b.score - a.score)[0]?.stat;

  const mostPlayed = candidates.at(0);

  return {
    strong: rankBy(rateScore),
    weak: rankBy((stat) => rateScore({ ...stat, wins: stat.losses, losses: stat.wins })),
    mostPlayed,
    mostPlayedIsTied: mostPlayed !== undefined && mostPlayed.totalGames === candidates[1]?.totalGames,
  };
}
