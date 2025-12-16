"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PlayerLunchDinnerWinRateResponse } from "@/app/api/stats/types";
import { statsQueryKeys } from "@/config/query-keys";

type ChartData = {
  name: string;
  absDiff: number;
  diff: number;
  lunchWinRate: number;
  dinnerWinRate: number;
  lunchGames: number;
  dinnerGames: number;
};

/**
 * 점심/저녁 승률 차이 랭킹 차트
 */
export function LunchDinnerDiffRankingChart() {
  const { data, isPending, error } = useQuery<
    PlayerLunchDinnerWinRateResponse[]
  >({
    queryKey: statsQueryKeys.stats.rankings.lunchDinnerDiff(),
    queryFn: async () => {
      const response = await fetch("/api/stats/rankings/lunch-dinner-diff");
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }
      return (await response.json()) as PlayerLunchDinnerWinRateResponse[];
    },
  });

  const chartData = useMemo<ChartData[]>(() => {
    if (!data) {
      return [];
    }
    return data.map((item) => ({
      name: item.playerNickname,
      absDiff: item.absWinRateDiff,
      diff: item.dinnerWinRateDiff,
      lunchWinRate: item.lunchStats.winRate,
      dinnerWinRate: item.dinnerStats.winRate,
      lunchGames: item.lunchStats.totalGames,
      dinnerGames: item.dinnerStats.totalGames,
    }));
  }, [data]);

  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          로딩 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }

  const topData = chartData.slice(0, 30);

  return (
    <div className="space-y-6">
      <p className="text-gray-400">
        점심/저녁 승률 차이(<span className="text-white">절대값</span>)가 큰
        순서입니다. 색상은{" "}
        <span className="text-green-400">저녁이 더 높음</span>,
        <span className="text-red-400"> 점심이 더 높음</span>을 의미합니다.
      </p>

      <div
        style={{ width: "100%", height: Math.max(420, topData.length * 34) }}
      >
        <ResponsiveContainer>
          <BarChart data={topData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis type="number" domain={[0, 100]} stroke="#888" unit="%p" />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              stroke="#888"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a2e",
                border: "1px solid #333",
                borderRadius: 8,
              }}
              formatter={(value: number, key: string, ctx) => {
                const payload = ctx?.payload as ChartData | undefined;
                if (!payload) return [`${value}`, key];
                if (key !== "absDiff") return [`${value}`, key];
                const direction = payload.diff >= 0 ? "저녁-점심" : "점심-저녁";
                return [
                  `${payload.absDiff}%p (${direction} ${payload.diff}%p)`,
                  "차이",
                ];
              }}
              labelFormatter={(label) => `플레이어: ${label}`}
            />
            <Legend />
            <Bar dataKey="absDiff" name="승률 차이(절대값)" fill="#22c55e">
              {topData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.diff >= 0 ? "#22c55e" : "#ef4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
