"use client";
import { WinRateStats } from "@/app/api/stats/types";
import { usePlayerCombinedWinRate } from "../../hooks/usePlayerCombinedWinRate";
import { useScrimWinRateTier } from "../../hooks/useScrimWinRateTier";
import { useMemo, useState } from "react";
import { LunchDinnerOption } from "@/components/LunchDinnerOption";
import { round } from "es-toolkit";

export function ScrimWinRate() {
  const { overallData, matchData, gameData } = usePlayerCombinedWinRate();
  const [unit, setUnit] = useState<"all" | "lunch" | "dinner">("all");
  const getTier = useScrimWinRateTier();

  const stats = useMemo(() => {
    if (unit === "all") {
      return overallData
        .map((it) => {
          const tier = getTier(it.matchStats, it.gameStats);
          return { ...it, tier };
        })
        .toSorted((a, b) => b.tier.score - a.tier.score);
    }

    return overallData
      .map((row) => {
        const matchStat = matchData.find((it) => it.playerNickname === row.playerNickname);
        const gameStat = gameData.find((it) => it.playerNickname === row.playerNickname);

        const lunchTier = getTier(matchStat?.lunchStats ?? EMPTY_STATS, gameStat?.lunchStats ?? EMPTY_STATS);
        const dinnerTier = getTier(matchStat?.dinnerStats ?? EMPTY_STATS, gameStat?.dinnerStats ?? EMPTY_STATS);

        if (unit === "lunch") {
          return {
            ...row,
            matchStats: matchStat?.lunchStats ?? EMPTY_STATS,
            gameStats: gameStat?.lunchStats ?? EMPTY_STATS,
            tier: lunchTier,
          };
        } else {
          return {
            ...row,
            matchStats: matchStat?.dinnerStats ?? EMPTY_STATS,
            gameStats: gameStat?.dinnerStats ?? EMPTY_STATS,
            tier: dinnerTier,
          };
        }
      })
      .filter((it) => it.matchStats.totalGames > 0)
      .toSorted((a, b) => b.tier.score - a.tier.score);
  }, [unit, matchData, gameData, overallData, getTier]);

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 p-4 bg-black/20">
      <LunchDinnerOption unit={unit} setUnit={setUnit} />
      <table className="min-w-full text-sm overflow-x-scroll">
        <thead className="bg-white/5 text-gray-300">
          <tr>
            <th className="px-4 py-3 text-left">플레이어</th>
            <th className="px-4 py-3 text-left">내전 승률</th>
            <th className="px-4 py-3 text-left max-md:hidden">내전 전적</th>
            <th className="px-4 py-3 text-left">경기 승률</th>
            <th className="px-4 py-3 text-left max-md:hidden">경기 전적</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((row) => {
            const { tier } = row;
            const tierScore = formatTierScore(tier.score);

            return (
              <tr key={row.playerId} className="border-t border-white/10 transition-colors hover:bg-white/6">
                <td className="px-4 py-2 font-medium text-white">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{row.playerName}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${tier.tier.className}`}
                    >
                      {tier.tier.label}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-300">{tierScore}</span>
                  </div>
                  <div className="text-xs text-gray-400">{row.playerNickname}</div>
                </td>
                <td className="px-4 py-2">
                  <WinRatePill stats={row.matchStats} />
                </td>
                <td className="px-4 py-2 text-gray-300 max-md:hidden">{formatRecord(row.matchStats)}</td>
                <td className="px-4 py-2">
                  <WinRatePill stats={row.gameStats} accent="purple" />
                </td>
                <td className="px-4 py-2 text-gray-300 max-md:hidden">{formatRecord(row.gameStats)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WinRatePill({
  stats,
  accent = "cyan",
}: {
  readonly stats: WinRateStats;
  readonly accent?: "cyan" | "purple";
}) {
  const color = accent === "purple" ? "text-purple-300" : "text-cyan-300";
  const bgColor = accent === "purple" ? "bg-purple-500/10" : "bg-cyan-500/10";
  const borderColor = accent === "purple" ? "border-purple-500/30" : "border-cyan-500/30";

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${color} ${bgColor} ${borderColor} border`}
    >
      {stats.winRate ?? 0}%
    </span>
  );
}

function formatRecord(stats: WinRateStats): string {
  return `${stats.wins}승 ${stats.losses}패 ${stats.draws}무 (${stats.totalGames}경기)`;
}

function formatTierScore(score: number): string {
  const normalized = round(score, 1);
  const display = Number.isInteger(normalized) ? normalized.toFixed(0) : normalized.toFixed(1);

  return `${display}%`;
}

const EMPTY_STATS: WinRateStats = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  winRate: 0,
};
