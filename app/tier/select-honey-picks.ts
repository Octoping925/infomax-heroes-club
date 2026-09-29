import { calculateConservativeWinRateScore } from "@/app/stats/utils/conservative-win-rate";
import type { HeroMetaRow } from "@/domain/hots/service/hero-meta-tier";
import type { HeroRole } from "@/domain/hots/models";

function percentile(values: ReadonlyArray<number>, ratio: number): number {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * ratio)];
}

export function selectHoneyPicks(rows: ReadonlyArray<HeroMetaRow>): Set<HeroMetaRow["hero"]> {
  const byRole = rows
    .filter((row) => row.games >= 100 && row.tier !== null)
    .reduce((acc, row) => {
      acc.set(row.role, [...(acc.get(row.role) ?? []), row]);
      return acc;
    }, new Map<HeroRole, HeroMetaRow[]>());

  const picks = new Set<HeroMetaRow["hero"]>();
  for (const group of byRole.values()) {
    const winScores = group.map((row) =>
      calculateConservativeWinRateScore({
        totalGames: row.games,
        wins: row.wins,
        losses: row.losses,
        draws: 0,
        winRate: row.winRate,
      }),
    );
    const winCutoff = percentile(winScores, 0.65);
    const banRates = group.flatMap((row) => (row.banRate === null ? [] : [row.banRate]));
    const banCutoff = banRates.length > 0 ? percentile(banRates, 0.75) : null;
    const pickCutoff = percentile(
      group.map((row) => row.pickRate),
      0.75,
    );

    group.forEach((row, index) => {
      const lowDemand =
        row.banRate === null ? row.pickRate <= pickCutoff : banCutoff !== null && row.banRate <= banCutoff;
      if (winScores[index] >= winCutoff && lowDemand) picks.add(row.hero);
    });
  }
  return picks;
}
