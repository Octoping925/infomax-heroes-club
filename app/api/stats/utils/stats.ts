import { GameResult } from "@/generated/prisma/client";
import { WinRateStats } from "@/app/api/stats/types";
import { calculateWinRate } from "@/utils/win-rate";

export type ResultCounts = {
  wins: number;
  losses: number;
  draws: number;
};

export function createResultCounts(): ResultCounts {
  return { wins: 0, losses: 0, draws: 0 };
}

export function updateCountsByResult(counts: ResultCounts, result: GameResult) {
  if (result === GameResult.WIN) {
    counts.wins += 1;
  } else if (result === GameResult.LOSE) {
    counts.losses += 1;
  } else {
    counts.draws += 1;
  }
}

export function calculateTotalGames(counts: ResultCounts) {
  return counts.wins + counts.losses + counts.draws;
}

export function toResultByWinnerTeamNumber(winnerTeamNumber: number | null, teamNumber: number): GameResult {
  if (winnerTeamNumber === null) {
    return GameResult.DRAW;
  }
  return winnerTeamNumber === teamNumber ? GameResult.WIN : GameResult.LOSE;
}

export function buildWinRateStatsFromCounts(counts: ResultCounts): WinRateStats {
  return {
    totalGames: calculateTotalGames(counts),
    wins: counts.wins,
    losses: counts.losses,
    draws: counts.draws,
    winRate: calculateWinRate(counts.wins, counts.losses, counts.draws),
  };
}

export function buildWinRateStatsFromResults(results: GameResult[]): WinRateStats {
  const counts = createResultCounts();
  for (const result of results) {
    updateCountsByResult(counts, result);
  }
  return buildWinRateStatsFromCounts(counts);
}
