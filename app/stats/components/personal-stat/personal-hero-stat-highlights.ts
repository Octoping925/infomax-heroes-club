import type { HeroWinRateResponse, WinRateStats } from "@/app/api/stats/types";
import { HeroMap } from "@/domain/hots/constants";
import { calculateConservativeWinRateScore } from "../../utils/conservative-win-rate";

const MIN_RATE_GAMES = 10;
const MIN_PICK_GAMES = 3;

export function getPersonalHeroStatHighlights(stats: readonly HeroWinRateResponse[]) {
  const byGames = stats.toSorted((a, b) =>
    b.totalGames - a.totalGames || HeroMap[a.hero].localeCompare(HeroMap[b.hero], "ko"),
  );
  const rateCandidates = byGames.filter((stat) => stat.totalGames >= MIN_RATE_GAMES);
  const rankBy = (scoreFor: (stat: WinRateStats) => number) => rateCandidates
    .map((stat) => ({ stat, score: scoreFor(stat) }))
    .filter(({ score }) => score > 50)
    .toSorted((a, b) => b.score - a.score)[0]?.stat;

  const mostPlayed = byGames.find((stat) => stat.totalGames >= MIN_PICK_GAMES);

  return {
    strong: rankBy(calculateConservativeWinRateScore),
    weak: rankBy((stat) => calculateConservativeWinRateScore({ ...stat, wins: stat.losses, losses: stat.wins })),
    mostPlayed,
    mostPlayedIsTied: mostPlayed !== undefined && mostPlayed.totalGames === byGames[1]?.totalGames,
  };
}
