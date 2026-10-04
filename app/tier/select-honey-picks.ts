import { calculateConservativeWinRateScore } from "@/app/stats/utils/conservative-win-rate";
import type { HeroMetaRow } from "@/domain/hots/service/hero-meta/hero-meta-tier";
import { groupBy, median } from "es-toolkit";

export function selectHoneyPicks(rows: ReadonlyArray<HeroMetaRow>): Set<HeroMetaRow["hero"]> {
  const byRole = groupBy(
    rows.filter((row) => row.games >= 200 && row.tier !== null),
    (row) => row.role,
  );

  const picks = new Set<HeroMetaRow["hero"]>();
  for (const group of Object.values(byRole)) {
    if (group.length < 5) continue;

    const ranked = group
      .map((row) => ({
        row,
        winScore: calculateConservativeWinRateScore({
          totalGames: row.games,
          wins: row.wins,
          losses: row.losses,
          draws: 0,
          winRate: row.winRate,
        }),
      }))
      .sort((a, b) => b.winScore - a.winScore || a.row.hero.localeCompare(b.row.hero));

    const banRates = group.flatMap((row) => (row.banRate === null ? [] : [row.banRate]));
    const banCutoff = banRates.length > 0 ? median(banRates) : null;
    const pickCutoff = median(group.map((row) => row.pickRate));

    ranked.slice(0, Math.floor(group.length * 0.3)).forEach(({ row }) => {
      const lowDemand =
        row.banRate === null ? row.pickRate <= pickCutoff : banCutoff !== null && row.banRate <= banCutoff;
      if (lowDemand) picks.add(row.hero);
    });
  }
  return picks;
}
