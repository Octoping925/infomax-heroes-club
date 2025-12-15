"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PlayerLunchDinnerWinRateResponse } from "@/app/api/stats/types";

type ChartData = {
  name: string;
  lunchWinRate: number;
  dinnerWinRate: number;
  lunchGames: number;
  dinnerGames: number;
};

/**
 * 플레이어별 점심/저녁 내전 승률(게임 단위) 차트
 */
export function LunchDinnerWinRateChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stats/players/lunch-dinner");
      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result: PlayerLunchDinnerWinRateResponse[] = await response.json();
      const chartData: ChartData[] = result
        .filter(
          (item) => item.lunchStats.totalGames > 0 || item.dinnerStats.totalGames > 0
        )
        .map((item) => ({
          name: item.playerNickname,
          lunchWinRate: item.lunchStats.winRate,
          dinnerWinRate: item.dinnerStats.winRate,
          lunchGames: item.lunchStats.totalGames,
          dinnerGames: item.dinnerStats.totalGames,
        }));

      setData(chartData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
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
        <p className="text-red-400">❌ {error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-400">
        점심/저녁 내전의 <span className="text-white">게임 단위</span> 승률을
        비교합니다. (Match.type 기준)
      </p>

      <div style={{ width: "100%", height: Math.max(420, data.length * 36) }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis type="number" domain={[0, 100]} stroke="#888" unit="%" />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
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
                const label =
                  key === "lunchWinRate" ? "점심 승률" : "저녁 승률";
                const games =
                  key === "lunchWinRate"
                    ? payload?.lunchGames ?? 0
                    : payload?.dinnerGames ?? 0;
                return [`${value}% (${games}게임)`, label];
              }}
            />
            <Legend
              formatter={(value) =>
                value === "lunchWinRate" ? "점심" : "저녁"
              }
            />
            <Bar dataKey="lunchWinRate" name="lunchWinRate" fill="#00d4ff" />
            <Bar dataKey="dinnerWinRate" name="dinnerWinRate" fill="#7b2ff7" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


