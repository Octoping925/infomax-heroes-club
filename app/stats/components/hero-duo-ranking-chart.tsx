"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { HeroDuoWinRateResponse } from "@/app/api/stats/types";
import { HeroMap } from "@/domain/hots/constants";
import { statsQueryKeys } from "@/config/query-keys";
import { buildStatsUrl } from "../utils/build-stats-url";
import { useStatsYear } from "../hooks/useStatsYearFilter";

type DuoRow = {
  readonly duoName: string;
  readonly winRate: number;
  readonly totalGames: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
};

const DEFAULT_MIN_GAMES: number = 3;
const DEFAULT_LIMIT: number = 50;

/**
 * 영웅 듀오(같은 팀) 승률 랭킹 (경기 단위)
 */
export function HeroDuoRankingChart() {
  const { selectedYear } = useStatsYear();
  const year = selectedYear ?? undefined;
  const [minCount, setMinCount] = useState<number>(DEFAULT_MIN_GAMES);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);

  const { data, error } = useSuspenseQuery<HeroDuoWinRateResponse[]>({
    queryKey: statsQueryKeys.stats.heroes.fantasyDuo({ minCount, limit, year }),
    queryFn: async () => {
      const response = await fetch(buildStatsUrl("/api/stats/heroes/fantasy-duo", { minCount, limit, year }));
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as HeroDuoWinRateResponse[];
    },
  });

  const rows: DuoRow[] = data.map((item) => {
    const heroAName = HeroMap[item.heroA] ?? String(item.heroA);
    const heroBName = HeroMap[item.heroB] ?? String(item.heroB);
    return {
      duoName: `${heroAName} × ${heroBName}`,
      winRate: item.winRate,
      totalGames: item.totalGames,
      wins: item.wins,
      losses: item.losses,
      draws: item.draws,
    };
  });

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-gray-400">
          <span className="text-white">경기 1판을 1경기</span>로 보고, <span className="text-white">같은 팀</span>이었던
          영웅 2개 조합의 승률을 집계합니다.
        </p>
        <p className="text-xs text-gray-500">
          무승부는 분모(총 경기 수)에 포함되며, 승률 계산은 <span className="text-gray-300">승 / (승+패+무)</span>{" "}
          기준입니다.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">최소 경기 수</span>
          <input
            type="number"
            min={1}
            value={minCount}
            onChange={(e) => setMinCount(Number(e.target.value))}
            className="w-32 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-cyan-500/60"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">표시 개수</span>
          <input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-32 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-cyan-500/60"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="flex justify-center py-12">
          <p className="text-gray-500">조건에 맞는 영웅 듀오 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-gray-300">
                <th className="px-4 py-3 w-16">순위</th>
                <th className="px-4 py-3">영웅 듀오</th>
                <th className="px-4 py-3 w-32">승률</th>
                <th className="px-4 py-3 w-24">경기</th>
                <th className="px-4 py-3 w-24">승</th>
                <th className="px-4 py-3 w-24">패</th>
                <th className="px-4 py-3 w-24">무</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.duoName}-${index}`}
                  className="border-t border-white/10 hover:bg-white/6 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-white">{row.duoName}</td>
                  <td className="px-4 py-3">
                    <span className={row.winRate >= 50 ? "text-green-400" : "text-red-400"}>{row.winRate}%</span>
                  </td>
                  <td className="px-4 py-3 text-gray-200">{row.totalGames}</td>
                  <td className="px-4 py-3 text-gray-200">{row.wins}</td>
                  <td className="px-4 py-3 text-gray-200">{row.losses}</td>
                  <td className="px-4 py-3 text-gray-200">{row.draws}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
