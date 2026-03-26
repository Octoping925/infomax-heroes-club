"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { FantasyDuoWinRateResponse } from "@/app/api/stats/types";
import { type LunchDinnerUnit, statsQueryKeys } from "@/config/query-keys";
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

const DEFAULT_MIN_MATCHES = 2;
const DEFAULT_MIN_GAMES = 5;
const DEFAULT_LIMIT = 50;

/**
 * '환상의 듀오' 랭킹 (내전 단위)
 */
export function FantasyDuoRankingChart() {
  const { selectedYear } = useStatsYear();
  const year = selectedYear ?? undefined;
  const [unit, setUnit] = useState<LunchDinnerUnit>("game");
  const [minCountByUnit, setMinCountByUnit] = useState<Record<LunchDinnerUnit, number>>({
    match: DEFAULT_MIN_MATCHES,
    game: DEFAULT_MIN_GAMES,
  });
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const minCount = minCountByUnit[unit];

  const handleMinCountChange = (nextValue: number) => {
    setMinCountByUnit((prev) => ({
      ...prev,
      [unit]: nextValue,
    }));
  };

  const { data, error } = useSuspenseQuery<FantasyDuoWinRateResponse[]>({
    queryKey: statsQueryKeys.stats.players.fantasyDuo({
      unit,
      minCount,
      limit,
      year,
    }),
    queryFn: async () => {
      const response = await fetch(
        buildStatsUrl("/api/stats/players/fantasy-duo", {
          unit,
          minCount,
          limit,
          year,
        }),
      );
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as FantasyDuoWinRateResponse[];
    },
  });

  const rows: DuoRow[] = data.map((item) => ({
    duoName: `${item.playerA.playerNickname} × ${item.playerB.playerNickname}`,
    winRate: item.winRate,
    totalGames: item.totalGames,
    wins: item.wins,
    losses: item.losses,
    draws: item.draws,
  }));

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
          {unit === "match" ? (
            <>
              <span className="text-white">내전 1건을 1경기</span>로 보고, <span className="text-white">같은 팀</span>
              이었던 2인 조합의 승률을 집계합니다.
            </>
          ) : (
            <>
              <span className="text-white">게임 1판을 1경기</span>로 보고, <span className="text-white">같은 팀</span>
              이었던 2인 조합의 승률을 집계합니다.
            </>
          )}
        </p>
        <p className="text-xs text-gray-500">
          무승부는 분모(총 경기 수)에 포함되며, 승률 계산은 <span className="text-gray-300">승 / (승+패+무)</span>{" "}
          기준입니다.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">기준</span>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value === "game" ? "game" : "match")}
            className="w-40 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-cyan-500/60"
          >
            <option className="text-black" value="game">
              경기
            </option>
            <option className="text-black" value="match">
              내전
            </option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">{unit === "match" ? "최소 내전 수" : "최소 경기 수"}</span>
          <input
            type="number"
            min={1}
            value={minCount}
            onChange={(e) => handleMinCountChange(Number(e.target.value))}
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
          <p className="text-gray-500">조건에 맞는 듀오 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-gray-300">
                <th className="px-4 py-3 w-16">순위</th>
                <th className="px-4 py-3">듀오</th>
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
                  className="border-t border-white/10 hover:bg-white/[0.06] transition-colors"
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
